/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.model.Project;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import javax.annotation.PreDestroy;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Pedro Oliveira
 */
@Component
public class PlacedOrderService extends OneBaseService {

	@PreDestroy
	public void destroy() {
		_executorService.shutdownNow();
	}

	public JSONArray getProjectPlacedOrders(
			Project project, String restrictFields)
		throws Exception {

		JSONArray placedOrdersJSONArray = new JSONArray();

		if (Validator.isNull(project.getAccountExternalReferenceCode())) {
			return placedOrdersJSONArray;
		}

		String authorization = getAuthorization();
		String placedOrderRestrictFields = _getPlacedOrderRestrictFields(
			restrictFields);

		List<JSONObject> jsonObjects = new ArrayList<>();

		JSONObject jsonObject = _getPlacedOrdersJSONObject(
			authorization, 1, project, placedOrderRestrictFields);

		jsonObjects.add(jsonObject);

		int lastPage = jsonObject.optInt("lastPage", 1);

		if (lastPage > _MAX_PAGES) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Unable to read more than ", _MAX_PAGES,
						" pages of placed orders for account ",
						project.getAccountExternalReferenceCode()));
			}

			lastPage = _MAX_PAGES;
		}

		List<Future<JSONObject>> futures = new ArrayList<>();

		for (int page = 2; page <= lastPage; page++) {
			int curPage = page;

			futures.add(
				_executorService.submit(
					() -> _getPlacedOrdersJSONObject(
						authorization, curPage, project,
						placedOrderRestrictFields)));
		}

		for (Future<JSONObject> future : futures) {
			try {
				jsonObjects.add(future.get());
			}
			catch (ExecutionException executionException) {
				for (Future<JSONObject> curFuture : futures) {
					curFuture.cancel(true);
				}

				if (executionException.getCause() instanceof
						Exception exception) {

					throw exception;
				}

				throw executionException;
			}
		}

		for (JSONObject curJSONObject : jsonObjects) {
			JSONArray itemsJSONArray = curJSONObject.getJSONArray("items");

			for (int i = 0; i < itemsJSONArray.length(); i++) {
				JSONObject placedOrderJSONObject = itemsJSONArray.getJSONObject(
					i);

				if (!_isProjectPlacedOrder(placedOrderJSONObject, project)) {
					continue;
				}

				placedOrdersJSONArray.put(placedOrderJSONObject);
			}
		}

		return placedOrdersJSONArray;
	}

	private String _getPlacedOrderRestrictFields(String restrictFields) {
		if (Validator.isNull(restrictFields)) {
			return null;
		}

		List<String> fieldNames = new ArrayList<>();

		for (String fieldName : StringUtil.split(restrictFields)) {
			String trimmedFieldName = fieldName.trim();

			if (Validator.isNull(trimmedFieldName) ||
				trimmedFieldName.equals(_FIELD_NAME_CUSTOM_FIELDS) ||
				trimmedFieldName.startsWith(_FIELD_NAME_CUSTOM_FIELDS + ".")) {

				continue;
			}

			fieldNames.add(trimmedFieldName);
		}

		return StringUtil.merge(fieldNames, ",");
	}

	private JSONObject _getPlacedOrdersJSONObject(
			String authorization, int page, Project project,
			String restrictFields)
		throws Exception {

		UriComponentsBuilder uriComponentsBuilder =
			UriComponentsBuilder.fromPath(
				_PATH_PLACED_ORDERS
			).queryParam(
				"nestedFields", "placedOrderItems"
			).queryParam(
				"page", page
			).queryParam(
				"pageSize", _PAGE_SIZE
			).queryParam(
				"sort", "{sort}"
			);

		Map<String, Object> uriVariables = new HashMap<>();

		uriVariables.put(
			"accountExternalReferenceCode",
			project.getAccountExternalReferenceCode());
		uriVariables.put(
			"channelExternalReferenceCode",
			_commerceChannelExternalReferenceCode);
		uriVariables.put("sort", "createDate:desc");

		if (Validator.isNotNull(restrictFields)) {
			uriComponentsBuilder.queryParam(
				"restrictFields", "{restrictFields}");

			uriVariables.put("restrictFields", restrictFields);
		}

		return new JSONObject(
			get(
				authorization,
				uriComponentsBuilder.encode(
				).buildAndExpand(
					uriVariables
				).toUri()));
	}

	private String _getProjectExternalReferenceCode(
		JSONObject customFieldsJSONObject) {

		String salesforceProjectId = customFieldsJSONObject.optString(
			"salesforceProjectId");

		if (Validator.isNotNull(salesforceProjectId)) {
			return salesforceProjectId;
		}

		JSONObject orderMetadataJSONObject = _toJSONObject(
			customFieldsJSONObject.optString("order-metadata"));

		if (orderMetadataJSONObject == null) {
			return null;
		}

		return orderMetadataJSONObject.optString("salesforceProjectId");
	}

	private String _getProjectName(JSONObject customFieldsJSONObject) {
		String projectName = customFieldsJSONObject.optString("projectName");

		if (Validator.isNotNull(projectName)) {
			return projectName;
		}

		JSONArray koroneikiProjectsJSONArray = _toJSONArray(
			customFieldsJSONObject.optString("koroneiki-project"));

		if ((koroneikiProjectsJSONArray == null) ||
			koroneikiProjectsJSONArray.isEmpty()) {

			return null;
		}

		JSONObject koroneikiProjectJSONObject =
			koroneikiProjectsJSONArray.optJSONObject(0);

		if (koroneikiProjectJSONObject == null) {
			return null;
		}

		return koroneikiProjectJSONObject.optString("name");
	}

	private boolean _isProjectPlacedOrder(
		JSONObject placedOrderJSONObject, Project project) {

		JSONObject customFieldsJSONObject = placedOrderJSONObject.optJSONObject(
			"customFields");

		if (customFieldsJSONObject == null) {
			return false;
		}

		String projectExternalReferenceCode = _getProjectExternalReferenceCode(
			customFieldsJSONObject);

		if (Validator.isNotNull(projectExternalReferenceCode)) {
			return Objects.equals(
				projectExternalReferenceCode,
				project.getExternalReferenceCode());
		}

		String projectName = _getProjectName(customFieldsJSONObject);

		if (Validator.isNull(projectName)) {
			return false;
		}

		return Objects.equals(projectName, project.getName());
	}

	private JSONArray _toJSONArray(String value) {
		if (Validator.isNull(value)) {
			return null;
		}

		try {
			return new JSONArray(value);
		}
		catch (JSONException jsonException) {
			if (_log.isDebugEnabled()) {
				_log.debug(jsonException);
			}

			return null;
		}
	}

	private JSONObject _toJSONObject(String value) {
		if (Validator.isNull(value)) {
			return null;
		}

		try {
			return new JSONObject(value);
		}
		catch (JSONException jsonException) {
			if (_log.isDebugEnabled()) {
				_log.debug(jsonException);
			}

			return null;
		}
	}

	private static final String _FIELD_NAME_CUSTOM_FIELDS = "customFields";

	private static final int _MAX_PAGES = 20;

	private static final int _MAX_THREADS = 4;

	private static final int _PAGE_SIZE = 200;

	private static final String _PATH_PLACED_ORDERS =
		"/o/headless-commerce-delivery-order/v1.0/channels" +
			"/by-externalReferenceCode/{channelExternalReferenceCode}" +
				"/accounts/by-externalReferenceCode" +
					"/{accountExternalReferenceCode}/placed-orders";

	private static final Log _log = LogFactory.getLog(PlacedOrderService.class);

	@Value("${liferay.one.commerce.channel.external.reference.code}")
	private String _commerceChannelExternalReferenceCode;

	private final ExecutorService _executorService =
		Executors.newFixedThreadPool(
			_MAX_THREADS,
			runnable -> new Thread(runnable, "Placed Order Page Reader"));

}