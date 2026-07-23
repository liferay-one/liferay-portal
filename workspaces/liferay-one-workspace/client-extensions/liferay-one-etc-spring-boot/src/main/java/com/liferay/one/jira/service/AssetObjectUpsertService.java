/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.converter.BaseJiraAssetObjectConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.util.List;
import java.util.Objects;
import java.util.function.BiPredicate;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class AssetObjectUpsertService {

	public boolean isUnchangedByExternalUpdatedAt(
		BaseJiraAssetObjectConverter converter,
		JiraAssetObject existingJiraAssetObject,
		JiraAssetObject jiraAssetObject) {

		String externalUpdatedAtAttributeName =
			converter.getExternalUpdatedAtAttributeName();

		String externalUpdatedAt = jiraAssetObject.getAttributeValue(
			externalUpdatedAtAttributeName);

		if (Validator.isNull(externalUpdatedAt)) {
			return false;
		}

		return Objects.equals(
			externalUpdatedAt,
			existingJiraAssetObject.getAttributeValue(
				externalUpdatedAtAttributeName));
	}

	public void upsert(
		BaseJiraAssetObjectConverter converter,
		JiraAssetObject jiraAssetObject) {

		upsert(converter, jiraAssetObject, null);
	}

	public void upsert(
		BaseJiraAssetObjectConverter converter, JiraAssetObject jiraAssetObject,
		BiPredicate<JiraAssetObject, JiraAssetObject>
			shouldSkipUpdateBiPredicate) {

		String externalKeyAttributeName =
			converter.getExternalKeyAttributeName();

		String externalKey = jiraAssetObject.getAttributeValue(
			externalKeyAttributeName);

		if (Validator.isNull(externalKey)) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Unable to upsert a ", converter.getObjectTypeName(),
						" asset object with no \"", externalKeyAttributeName,
						"\" value"));
			}

			return;
		}

		List<JiraAssetObject> jiraAssetObjects =
			_jiraAssetService.searchObjects(
				converter.getAQLWithBuilder(
					aqlBuilder -> aqlBuilder.andEquals(
						externalKey, externalKeyAttributeName)),
				converter::toJiraAssetObject);

		if (jiraAssetObjects.isEmpty()) {
			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Creating ", converter.getObjectTypeName(),
						" asset object for external key ", externalKey));
			}

			_jiraAssetService.createObject(
				converter.getObjectTypeId(), jiraAssetObject);

			return;
		}

		JiraAssetObject existingJiraAssetObject = jiraAssetObjects.get(0);

		if ((shouldSkipUpdateBiPredicate != null) &&
			shouldSkipUpdateBiPredicate.test(
				existingJiraAssetObject, jiraAssetObject)) {

			if (_log.isDebugEnabled()) {
				_log.debug(
					StringBundler.concat(
						"Skipping unchanged ", converter.getObjectTypeName(),
						" asset object for external key ", externalKey));
			}

			return;
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Updating ", converter.getObjectTypeName(),
					" asset object for external key ", externalKey));
		}

		_jiraAssetService.updateObject(
			existingJiraAssetObject.getObjectId(), jiraAssetObject);
	}

	private static final Log _log = LogFactory.getLog(
		AssetObjectUpsertService.class);

	@Autowired
	private JiraAssetService _jiraAssetService;

}