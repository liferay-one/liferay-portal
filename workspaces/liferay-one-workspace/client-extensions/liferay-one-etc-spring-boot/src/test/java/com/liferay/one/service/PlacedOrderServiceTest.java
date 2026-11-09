/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.model.Project;

import java.net.URI;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Pedro Oliveira
 */
@DisplayName("[SVC-PLACEDORDERSERVICE] PlacedOrderService")
public class PlacedOrderServiceTest {

	@BeforeEach
	public void setUp() {
		_testPlacedOrderService = new TestPlacedOrderService();

		ReflectionTestUtils.setField(
			_testPlacedOrderService, "_commerceChannelExternalReferenceCode",
			_CHANNEL_EXTERNAL_REFERENCE_CODE);
	}

	@Test
	public void testGetProjectPlacedOrdersIgnoresAProjectWithoutAnAccount()
		throws Exception {

		JSONArray jsonArray = _testPlacedOrderService.getProjectPlacedOrders(
			new Project(
				new JSONObject(
				).put(
					"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
				)),
			null);

		Assertions.assertTrue(jsonArray.isEmpty());

		List<URI> uris = _testPlacedOrderService.getURIs();

		Assertions.assertTrue(uris.isEmpty());
	}

	@Test
	public void testGetProjectPlacedOrdersKeepsOnlyTheOrdersOfTheProject()
		throws Exception {

		_testPlacedOrderService.addPage(
			1,
			_createPlacedOrder(
				1,
				new JSONObject(
				).put(
					"salesforceProjectId", _PROJECT_EXTERNAL_REFERENCE_CODE
				)),
			_createPlacedOrder(
				2,
				new JSONObject(
				).put(
					"order-metadata",
					new JSONObject(
					).put(
						"salesforceProjectId", _PROJECT_EXTERNAL_REFERENCE_CODE
					).toString()
				)),
			_createPlacedOrder(
				3,
				new JSONObject(
				).put(
					"projectName", _PROJECT_NAME
				)),
			_createPlacedOrder(
				4,
				new JSONObject(
				).put(
					"koroneiki-project",
					new JSONArray(
					).put(
						new JSONObject(
						).put(
							"name", _PROJECT_NAME
						)
					).toString()
				)),
			_createPlacedOrder(
				5,
				new JSONObject(
				).put(
					"projectName", _PROJECT_NAME
				).put(
					"salesforceProjectId", "PRJCT-OTHER"
				)),
			_createPlacedOrder(
				6,
				new JSONObject(
				).put(
					"projectName", "Other Project"
				)),
			_createPlacedOrder(7, new JSONObject()),
			new JSONObject(
			).put(
				"id", 8
			),
			_createPlacedOrder(
				9,
				new JSONObject(
				).put(
					"koroneiki-project", "not JSON"
				).put(
					"order-metadata", "not JSON"
				)));

		JSONArray jsonArray = _testPlacedOrderService.getProjectPlacedOrders(
			_createProject(), null);

		Assertions.assertEquals(List.of(1, 2, 3, 4), _getIds(jsonArray));
	}

	@Test
	public void testGetProjectPlacedOrdersReadsEveryPage() throws Exception {
		_testPlacedOrderService.addPage(
			2,
			_createPlacedOrder(
				1,
				new JSONObject(
				).put(
					"projectName", _PROJECT_NAME
				)));
		_testPlacedOrderService.addPage(
			2,
			_createPlacedOrder(
				2,
				new JSONObject(
				).put(
					"projectName", _PROJECT_NAME
				)));

		JSONArray jsonArray = _testPlacedOrderService.getProjectPlacedOrders(
			_createProject(), "account");

		Assertions.assertEquals(List.of(1, 2), _getIds(jsonArray));

		List<URI> uris = _testPlacedOrderService.getURIs();

		Assertions.assertEquals(2, uris.size());

		URI uri = uris.get(0);

		Assertions.assertEquals(
			"/o/headless-commerce-delivery-order/v1.0/channels" +
				"/by-externalReferenceCode/" +
					_CHANNEL_EXTERNAL_REFERENCE_CODE +
						"/accounts/by-externalReferenceCode/" +
							_ACCOUNT_EXTERNAL_REFERENCE_CODE + "/placed-orders",
			uri.getPath());

		String query = uri.getQuery();

		Assertions.assertTrue(query.contains("nestedFields=placedOrderItems"));
		Assertions.assertTrue(query.contains("page=1"));
		Assertions.assertTrue(query.contains("restrictFields=account"));
		Assertions.assertTrue(query.contains("sort=createDate:desc"));
	}

	@Test
	public void testGetProjectPlacedOrdersReadsEveryPageInPageOrder()
		throws Exception {

		for (int i = 1; i <= 6; i++) {
			_testPlacedOrderService.addPage(
				6,
				_createPlacedOrder(
					i,
					new JSONObject(
					).put(
						"projectName", _PROJECT_NAME
					)));
		}

		JSONArray jsonArray = _testPlacedOrderService.getProjectPlacedOrders(
			_createProject(), null);

		Assertions.assertEquals(List.of(1, 2, 3, 4, 5, 6), _getIds(jsonArray));
	}

	@Test
	public void testGetProjectPlacedOrdersRemovesCustomFieldsFromTheRestrictedFields()
		throws Exception {

		_testPlacedOrderService.addPage(
			1,
			_createPlacedOrder(
				1,
				new JSONObject(
				).put(
					"projectName", _PROJECT_NAME
				)));

		_testPlacedOrderService.getProjectPlacedOrders(
			_createProject(), "account, customFields,customFields.projectName");

		List<URI> uris = _testPlacedOrderService.getURIs();

		URI uri = uris.get(0);

		String query = uri.getQuery();

		Assertions.assertTrue(query.contains("restrictFields=account"));
		Assertions.assertFalse(query.contains("customFields"));
	}

	@Test
	public void testGetProjectPlacedOrdersStopsAfterTheMaximumPages()
		throws Exception {

		for (int i = 0; i < 25; i++) {
			_testPlacedOrderService.addPage(25);
		}

		_testPlacedOrderService.getProjectPlacedOrders(_createProject(), null);

		List<URI> uris = _testPlacedOrderService.getURIs();

		Assertions.assertEquals(20, uris.size());
	}

	private JSONObject _createPlacedOrder(
		int id, JSONObject customFieldsJSONObject) {

		return new JSONObject(
		).put(
			"customFields", customFieldsJSONObject
		).put(
			"id", id
		);
	}

	private Project _createProject() {
		return new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"name", _PROJECT_NAME
			).put(
				"r_accountEntryToProject_accountEntryERC",
				_ACCOUNT_EXTERNAL_REFERENCE_CODE
			));
	}

	private List<Integer> _getIds(JSONArray jsonArray) {
		List<Integer> ids = new ArrayList<>();

		for (int i = 0; i < jsonArray.length(); i++) {
			JSONObject jsonObject = jsonArray.getJSONObject(i);

			ids.add(jsonObject.getInt("id"));
		}

		return ids;
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACCNT-001";

	private static final String _CHANNEL_EXTERNAL_REFERENCE_CODE =
		"CHANNEL-001";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-001";

	private static final String _PROJECT_NAME = "Alpha";

	private TestPlacedOrderService _testPlacedOrderService;

	private static class TestPlacedOrderService extends PlacedOrderService {

		public void addPage(
			int lastPage, JSONObject... placedOrderJSONObjects) {

			JSONArray itemsJSONArray = new JSONArray();

			for (JSONObject placedOrderJSONObject : placedOrderJSONObjects) {
				itemsJSONArray.put(placedOrderJSONObject);
			}

			_responses.add(
				new JSONObject(
				).put(
					"items", itemsJSONArray
				).put(
					"lastPage", lastPage
				).toString());
		}

		public List<URI> getURIs() {
			List<URI> uris = new ArrayList<>(_uris);

			uris.sort(Comparator.comparingInt(this::_getPage));

			return uris;
		}

		@Override
		protected String get(String authorization, URI uri) {
			_uris.add(uri);

			return _responses.get(_getPage(uri) - 1);
		}

		@Override
		protected String getAuthorization() {
			return "Bearer token";
		}

		private int _getPage(URI uri) {
			UriComponents uriComponents = UriComponentsBuilder.fromUri(
				uri
			).build();

			MultiValueMap<String, String> queryParams =
				uriComponents.getQueryParams();

			return Integer.parseInt(queryParams.getFirst("page"));
		}

		private final List<String> _responses = new ArrayList<>();
		private final List<URI> _uris = new CopyOnWriteArrayList<>();

	}

}