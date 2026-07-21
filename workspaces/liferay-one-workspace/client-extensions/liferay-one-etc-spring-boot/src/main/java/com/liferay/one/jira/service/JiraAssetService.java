/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.exception.JiraAssetSchemaException;
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

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Drew Brokke
 */
@Component
public class JiraAssetService extends BaseJiraService {

	public JSONObject createObject(
		String objectTypeId, JiraAssetObject jiraAssetObject) {

		String requestBody = new JSONObject(
		).put(
			"attributes", jiraAssetObject.toAttributesJSONArray()
		).put(
			"objectTypeId", objectTypeId
		).toString();

		try {
			String response = post(
				requestBody, _headers(), _objectURI("create"));

			return _toJSONObject(response);
		}
		catch (WebClientResponseException webClientResponseException) {
			_log.error(
				StringBundler.concat(
					"Unable to create asset object with object type ",
					objectTypeId, ": ",
					webClientResponseException.getResponseBodyAsString(),
					"; request body: ", requestBody));

			throw webClientResponseException;
		}
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
		return _toSchemaJSONArray(
			get(
				getAuthorization(),
				_v1URI(
					StringBundler.concat(
						"objecttype/", objectTypeId, "/attributes"))),
			"Unable to parse attributes response for object type " +
				objectTypeId);
	}

	public JSONArray getObjectTypes(String schemaId) {
		return _toSchemaJSONArray(
			get(
				getAuthorization(),
				_v1URI(
					StringBundler.concat(
						"objectschema/", schemaId, "/objecttypes"))),
			"Unable to parse object types response for schema " + schemaId);
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

		String requestBody = new JSONObject(
		).put(
			"attributes", jiraAssetObject.toAttributesJSONArray()
		).toString();

		try {
			String response = put(
				requestBody, _headers(), _objectURI(objectId));

			return _toJSONObject(response);
		}
		catch (WebClientResponseException webClientResponseException) {
			_log.error(
				StringBundler.concat(
					"Unable to update asset object ", objectId, ": ",
					webClientResponseException.getResponseBodyAsString(),
					"; request body: ", requestBody));

			throw webClientResponseException;
		}
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

		try {
			return new JSONObject(response);
		}
		catch (JSONException jsonException) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to parse JSON object response", jsonException);
			}

			return new JSONObject();
		}
	}

	private JSONArray _toSchemaJSONArray(String response, String message) {
		if (Validator.isNull(response)) {
			throw new JiraAssetSchemaException(message + ": empty response");
		}

		try {
			return new JSONArray(response);
		}
		catch (JSONException jsonException) {
			throw new JiraAssetSchemaException(message, jsonException);
		}
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

	private static final Log _log = LogFactory.getLog(JiraAssetService.class);

	@Value("${liferay.one.jira.workspace.id}")
	private String _jiraWorkspaceId;

}