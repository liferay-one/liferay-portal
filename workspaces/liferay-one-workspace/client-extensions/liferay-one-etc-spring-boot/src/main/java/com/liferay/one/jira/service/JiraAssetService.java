/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.Validator;

import java.net.URI;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Drew Brokke
 */
@Component
public class JiraAssetService extends BaseJiraService {

	public JSONObject createObject(
		String objectTypeId, JiraAssetObject jiraAssetObject) {

		String response = post(
			new JSONObject(
			).put(
				"attributes", jiraAssetObject.toAttributesJSONArray()
			).put(
				"objectTypeId", objectTypeId
			).toString(),
			_headers(), _objectURI("create"));

		return _toJSONObject(response);
	}

	public JSONObject deleteObject(String objectId) {
		String response = delete(
			getAuthorization(), StringPool.BLANK, _objectURI(objectId));

		return _toJSONObject(response);
	}

	public JSONObject getObject(String objectId) {
		return _toJSONObject(get(getAuthorization(), _objectURI(objectId)));
	}

	public JSONArray getObjectSchemas() {
		JSONArray itemsJSONArray = new JSONArray();

		boolean last = false;
		int startAt = 0;

		while (!last) {
			JSONObject resultsJSONObject = _getObjectSchemasPageJSONObject(
				startAt);

			JSONArray valuesJSONArray = resultsJSONObject.optJSONArray(
				"values");

			if ((valuesJSONArray == null) || valuesJSONArray.isEmpty()) {
				break;
			}

			itemsJSONArray.putAll(valuesJSONArray);

			last = resultsJSONObject.optBoolean("isLast");

			startAt += _MAX_RESULTS;
		}

		return itemsJSONArray;
	}

	public JSONArray getObjectTypeAttributes(String objectTypeId) {
		return new JSONArray(
			get(
				getAuthorization(),
				_v1URI(
					StringBundler.concat(
						"objecttype/", objectTypeId, "/attributes"))));
	}

	public JSONArray getObjectTypes(String schemaId) {
		return new JSONArray(
			get(
				getAuthorization(),
				_v1URI(
					StringBundler.concat(
						"objectschema/", schemaId, "/objecttypes"))));
	}

	public JSONArray searchObjects(String aql) {
		JSONArray itemsJSONArray = new JSONArray();

		boolean last = false;
		int startAt = 0;

		while (!last) {
			JSONObject resultsJSONObject = _searchObjectsPage(aql, startAt);

			JSONArray valuesJSONArray = resultsJSONObject.optJSONArray(
				"values");

			if ((valuesJSONArray == null) || valuesJSONArray.isEmpty()) {
				break;
			}

			itemsJSONArray.putAll(valuesJSONArray);

			last = resultsJSONObject.optBoolean("last");

			startAt += _MAX_RESULTS;
		}

		return itemsJSONArray;
	}

	public <T> List<T> searchObjects(
		String aql, Function<JSONObject, T> transformFunction) {

		ArrayList<T> results = new ArrayList<>();

		JSONArray jsonArray = searchObjects(aql);

		for (int i = 0; i < jsonArray.length(); i++) {
			results.add(transformFunction.apply(jsonArray.getJSONObject(i)));
		}

		return results;
	}

	public JSONObject updateObject(
		String objectId, JiraAssetObject jiraAssetObject) {

		String response = put(
			new JSONObject(
			).put(
				"attributes", jiraAssetObject.toAttributesJSONArray()
			).toString(),
			_headers(), _objectURI(objectId));

		return _toJSONObject(response);
	}

	private JSONObject _getObjectSchemasPageJSONObject(int startAt) {
		String response = get(
			getAuthorization(),
			UriComponentsBuilder.fromUri(
				_v1URI("objectschema/list")
			).queryParam(
				"maxResults", _MAX_RESULTS
			).queryParam(
				"startAt", startAt
			).build(
			).toUri());

		return _toJSONObject(response);
	}

	private Map<String, String> _headers() {
		return HashMapBuilder.put(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).put(
			HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE
		).build();
	}

	private URI _objectURI(String suffix) {
		return _v1URI("object/" + suffix);
	}

	private JSONObject _searchObjectsPage(String aql, int startAt) {
		String response = post(
			new JSONObject(
			).put(
				"qlQuery", aql
			).toString(),
			_headers(),
			UriComponentsBuilder.fromUri(
				_v1URI("object/aql")
			).queryParam(
				"maxResults", _MAX_RESULTS
			).queryParam(
				"startAt", startAt
			).build(
			).toUri());

		return _toJSONObject(response);
	}

	private JSONObject _toJSONObject(String response) {
		if (Validator.isNull(response)) {
			return new JSONObject();
		}

		return new JSONObject(response);
	}

	private URI _v1URI(String path) {
		return UriComponentsBuilder.fromUriString(
			StringBundler.concat(
				_JIRA_CLOUD_API_URL, "/jsm/assets/workspace/", _jiraWorkspaceId,
				"/v1/", path)
		).build(
		).toUri();
	}

	private static final String _JIRA_CLOUD_API_URL =
		"https://api.atlassian.com";

	private static final int _MAX_RESULTS = 100;

	@Value("${liferay.one.jira.workspace.id}")
	private String _jiraWorkspaceId;

}