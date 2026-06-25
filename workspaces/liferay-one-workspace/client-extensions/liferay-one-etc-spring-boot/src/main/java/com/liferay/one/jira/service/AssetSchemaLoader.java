/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.one.jira.exception.JiraAssetSchemaException;
import com.liferay.petra.string.StringBundler;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Drew Brokke
 */
@Component
public class AssetSchemaLoader extends BaseService {

	@Cacheable("assetObjectTypeAttributeIds")
	public Map<String, String> getAttributeIds(
		String schemaName, String objectTypeName) {

		Map<String, String> objectTypeIds = _loadObjectTypeIds(schemaName);

		String objectTypeId = objectTypeIds.get(objectTypeName);

		if (objectTypeId == null) {
			throw new JiraAssetSchemaException(
				StringBundler.concat(
					"Object type \"", objectTypeName,
					"\" not found in schema \"", schemaName, "\""));
		}

		return _toNameIdMap(
			new JSONArray(
				_get(
					StringBundler.concat(
						"objecttype/", objectTypeId, "/attributes"))));
	}

	@Cacheable("assetObjectTypeIds")
	public Map<String, String> getObjectTypeIds(String schemaName) {
		return _loadObjectTypeIds(schemaName);
	}

	private String _get(String path) {
		try {
			return get(
				_getAuthorization(),
				UriComponentsBuilder.fromUriString(
					StringBundler.concat(
						_JIRA_CLOUD_API_URL, "/jsm/assets/workspace/",
						_jiraWorkspaceId, "/v1/", path)
				).build(
				).toUri());
		}
		catch (Exception exception) {
			throw new JiraAssetSchemaException(
				"Unable to complete JSM Assets request for " + path, exception);
		}
	}

	private String _getAuthorization() {
		Base64.Encoder encoder = Base64.getEncoder();

		String credentials = _jiraAPIEmailAddress + ":" + _jiraAPIToken;

		return "Basic " + encoder.encodeToString(credentials.getBytes());
	}

	private Map<String, String> _loadObjectTypeIds(String schemaName) {
		String schemaId = _resolveSchemaId(schemaName);

		return _toNameIdMap(
			new JSONArray(
				_get(
					StringBundler.concat(
						"objectschema/", schemaId, "/objecttypes"))));
	}

	private String _resolveSchemaId(String schemaName) {
		JSONObject responseJSONObject = new JSONObject(
			_get("objectschema/list"));

		JSONArray valuesJSONArray = responseJSONObject.getJSONArray("values");

		for (int i = 0; i < valuesJSONArray.length(); i++) {
			JSONObject schemaJSONObject = valuesJSONArray.getJSONObject(i);

			if (schemaName.equals(schemaJSONObject.getString("name"))) {
				return schemaJSONObject.getString("id");
			}
		}

		throw new JiraAssetSchemaException(
			"Object schema \"" + schemaName + "\" not found");
	}

	private Map<String, String> _toNameIdMap(JSONArray attributesJSONArray) {
		Map<String, String> attributeIds = new LinkedHashMap<>();

		for (int i = 0; i < attributesJSONArray.length(); i++) {
			JSONObject attributeJSONObject = attributesJSONArray.getJSONObject(
				i);

			attributeIds.put(
				attributeJSONObject.getString("name"),
				attributeJSONObject.getString("id"));
		}

		return attributeIds;
	}

	private static final String _JIRA_CLOUD_API_URL =
		"https://api.atlassian.com";

	@Value("${liferay.one.jira.api.email.address}")
	private String _jiraAPIEmailAddress;

	@Value("${liferay.one.jira.api.token}")
	private String _jiraAPIToken;

	@Value("${liferay.one.jira.workspace.id}")
	private String _jiraWorkspaceId;

}