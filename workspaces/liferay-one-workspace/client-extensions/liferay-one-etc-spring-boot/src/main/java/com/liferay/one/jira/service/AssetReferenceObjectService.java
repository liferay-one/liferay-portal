/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.converter.BaseJiraAssetObjectConverter;
import com.liferay.one.jira.exception.JiraAssetObjectException;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class AssetReferenceObjectService {

	/**
	 * Resolves a single external key to its existing asset object ID.
	 *
	 * @param  converter the converter describing the asset object type and its
	 *         external key attribute
	 * @param  externalKey the external key of the reference asset object
	 *
	 * @return the ID of the existing asset object, or <code>null</code> if the
	 *         external key is <code>null</code> or no matching asset object
	 *         exists
	 */
	public String fetchReferenceObjectId(
		BaseJiraAssetObjectConverter converter, String externalKey) {

		if (Validator.isNull(externalKey)) {
			return null;
		}

		Map<String, String> externalKeyToObjectIdMap = new HashMap<>();

		_putObjectIds(
			converter, Collections.singletonList(externalKey),
			externalKeyToObjectIdMap);

		return externalKeyToObjectIdMap.get(externalKey);
	}

	/**
	 * Resolves a collection of entities to the IDs of their existing asset
	 * objects. Entities whose external key is <code>null</code> or does not
	 * resolve to an existing asset object are skipped.
	 *
	 * @param  converter the converter describing the asset object type and its
	 *         external key attribute
	 * @param  entities the entities to resolve to asset objects
	 * @param  externalKeyFunction the function that extracts an external key
	 *         from an entity
	 *
	 * @return the IDs of the resolved asset objects, or <code>null</code> if
	 *         <code>entities</code> is <code>null</code>
	 */
	public <T> List<String> fetchReferenceObjectIds(
		BaseJiraAssetObjectConverter converter, Collection<T> entities,
		Function<T, String> externalKeyFunction) {

		if (entities == null) {
			return null;
		}

		Set<String> externalKeys = new LinkedHashSet<>();

		for (T entity : entities) {
			if (entity == null) {
				continue;
			}

			String externalKey = externalKeyFunction.apply(entity);

			if (Validator.isNotNull(externalKey)) {
				externalKeys.add(externalKey);
			}
		}

		return _resolveToObjectIds(converter, externalKeys, null);
	}

	/**
	 * Resolves a collection of entities to the IDs of their asset objects,
	 * creating an asset object for any external key that does not already
	 * resolve to one.
	 *
	 * @param  converter the converter describing the asset object type and its
	 *         external key attribute
	 * @param  entities the entities to resolve to asset objects
	 * @param  externalKeyFunction the function that extracts an external key
	 *         from an entity
	 * @param  createAssetObjectFunction the function that builds the asset
	 *         object to create for an entity whose external key is unresolved;
	 *         must not be <code>null</code>
	 *
	 * @return the IDs of the resolved and newly created asset objects, or
	 *         <code>null</code> if <code>entities</code> is <code>null</code>
	 */
	public <T> List<String> getOrCreateReferenceObjectIds(
		BaseJiraAssetObjectConverter converter, Collection<T> entities,
		Function<T, String> externalKeyFunction,
		Function<T, JiraAssetObject> createAssetObjectFunction) {

		Objects.requireNonNull(createAssetObjectFunction);

		if (entities == null) {
			return null;
		}

		Map<String, T> entitiesMap = new LinkedHashMap<>();

		for (T entity : entities) {
			if (entity == null) {
				continue;
			}

			String externalKey = externalKeyFunction.apply(entity);

			if (Validator.isNotNull(externalKey)) {
				entitiesMap.putIfAbsent(externalKey, entity);
			}
		}

		return _resolveToObjectIds(
			converter, entitiesMap.keySet(),
			externalKey -> createAssetObjectFunction.apply(
				entitiesMap.get(externalKey)));
	}

	/**
	 * Resolves a single external key to its existing asset object ID, throwing
	 * an exception when no matching asset object exists.
	 *
	 * @param  converter the converter describing the asset object type and its
	 *         external key attribute
	 * @param  externalKey the external key of the reference asset object
	 *
	 * @return the ID of the existing asset object
	 * @throws JiraAssetObjectException if no asset object exists for the given
	 *         external key
	 */
	public String getReferenceObjectId(
		BaseJiraAssetObjectConverter converter, String externalKey) {

		String objectId = fetchReferenceObjectId(converter, externalKey);

		if (objectId == null) {
			throw new JiraAssetObjectException(
				StringBundler.concat(
					"No \"", converter.getObjectTypeName(),
					"\" asset object exists for external key ", externalKey));
		}

		return objectId;
	}

	private String _createObject(
		BaseJiraAssetObjectConverter converter, String externalKey,
		Function<String, JiraAssetObject> createAssetObjectFunction) {

		JiraAssetObject jiraAssetObject = createAssetObjectFunction.apply(
			externalKey);

		if (jiraAssetObject == null) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Unable to create ", converter.getObjectTypeName(),
						" asset object for external key ", externalKey));
			}

			return null;
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Creating ", converter.getObjectTypeName(),
					" asset object for unresolved external key ", externalKey));
		}

		try {
			JSONObject jsonObject = _jiraAssetService.createObject(
				converter.getObjectTypeId(), jiraAssetObject);

			return jsonObject.optString("id", null);
		}
		catch (Exception exception) {
			_log.error(
				StringBundler.concat(
					"Unable to create ", converter.getObjectTypeName(),
					" asset object for external key ", externalKey),
				exception);

			return null;
		}
	}

	private void _putObjectIds(
		BaseJiraAssetObjectConverter converter, List<String> externalKeys,
		Map<String, String> externalKeyToObjectIdMap) {

		String externalKeyAttributeName =
			converter.getExternalKeyAttributeName();

		List<JiraAssetObject> jiraAssetObjects =
			_jiraAssetService.searchObjects(
				converter.getAQLWithBuilder(
					aqlBuilder -> aqlBuilder.andIn(
						externalKeys, externalKeyAttributeName)),
				converter::toJiraAssetObject);

		for (JiraAssetObject jiraAssetObject : jiraAssetObjects) {
			String externalKey = jiraAssetObject.getAttributeValue(
				externalKeyAttributeName);
			String objectId = jiraAssetObject.getObjectId();

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Resolved external key ", externalKey, " to existing ",
						converter.getObjectTypeName(), " asset object ",
						objectId));
			}

			String previousObjectId = externalKeyToObjectIdMap.putIfAbsent(
				externalKey, objectId);

			if ((previousObjectId != null) &&
				!Objects.equals(previousObjectId, objectId) &&
				_log.isWarnEnabled()) {

				_log.warn(
					StringBundler.concat(
						"Multiple asset objects share external key ",
						externalKey, ": ", previousObjectId, " and ", objectId,
						"; the reference will resolve to the first match ",
						previousObjectId));
			}
		}
	}

	private List<String> _resolveToObjectIds(
		BaseJiraAssetObjectConverter converter, Collection<String> externalKeys,
		Function<String, JiraAssetObject> createAssetObjectFunction) {

		List<String> resolvedObjectIds = new ArrayList<>();

		Set<String> uniqueExternalKeys = new LinkedHashSet<>();

		for (String externalKey : externalKeys) {
			if (Validator.isNotNull(externalKey)) {
				uniqueExternalKeys.add(externalKey);
			}
		}

		if (uniqueExternalKeys.isEmpty()) {
			return resolvedObjectIds;
		}

		Map<String, String> externalKeyToObjectIdMap = new HashMap<>();

		List<String> uniqueExternalKeysList = new ArrayList<>(
			uniqueExternalKeys);

		for (int i = 0; i < uniqueExternalKeysList.size(); i += _CHUNK_SIZE) {
			_putObjectIds(
				converter,
				uniqueExternalKeysList.subList(
					i,
					Math.min(i + _CHUNK_SIZE, uniqueExternalKeysList.size())),
				externalKeyToObjectIdMap);
		}

		for (String externalKey : uniqueExternalKeysList) {
			String objectId = externalKeyToObjectIdMap.get(externalKey);

			if ((objectId == null) && (createAssetObjectFunction != null)) {
				objectId = _createObject(
					converter, externalKey, createAssetObjectFunction);
			}

			if (objectId == null) {
				if (_log.isWarnEnabled()) {
					_log.warn(
						StringBundler.concat(
							"Unable to resolve external key ", externalKey,
							" to a ", converter.getObjectTypeName(),
							" asset object"));
				}

				continue;
			}

			resolvedObjectIds.add(objectId);
		}

		return resolvedObjectIds;
	}

	private static final int _CHUNK_SIZE = 50;

	private static final Log _log = LogFactory.getLog(
		AssetReferenceObjectService.class);

	@Autowired
	private JiraAssetService _jiraAssetService;

}