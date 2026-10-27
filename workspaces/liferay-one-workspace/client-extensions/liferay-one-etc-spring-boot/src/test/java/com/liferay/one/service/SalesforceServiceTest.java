/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.IdTokenCredentials;
import com.google.auth.oauth2.IdTokenProvider;
import com.google.auth.oauth2.ImpersonatedCredentials;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.salesforce.model.SalesforceQuery;

import java.math.BigDecimal;

import java.net.URI;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Veloso
 */
@DisplayName("[SVC-SALESFORCESERVICE] SalesforceService")
public class SalesforceServiceTest {

	@BeforeEach
	public void setUp() {
		_salesforceService = new SalesforceService();

		ReflectionTestUtils.setField(
			_salesforceService, "_gcfAudience", _AUDIENCE);
		ReflectionTestUtils.setField(
			_salesforceService, "_googleCredentials", _googleCredentials);
	}

	@Test
	public void testGetIdTokenCredentialsReusesOneInstance() {
		ReflectionTestUtils.setField(
			_salesforceService, "_gcfServiceAccount", _SERVICE_ACCOUNT);

		IdTokenCredentials idTokenCredentials =
			ReflectionTestUtils.invokeMethod(
				_salesforceService, "_getIdTokenCredentials");

		Assertions.assertSame(
			idTokenCredentials,
			ReflectionTestUtils.invokeMethod(
				_salesforceService, "_getIdTokenCredentials"));
	}

	@Test
	public void testGetIdTokenProviderImpersonatesTheConfiguredAccount() {
		ReflectionTestUtils.setField(
			_salesforceService, "_gcfServiceAccount", _SERVICE_ACCOUNT);

		IdTokenProvider idTokenProvider = ReflectionTestUtils.invokeMethod(
			_salesforceService, "_getIdTokenProvider");

		Assertions.assertInstanceOf(
			ImpersonatedCredentials.class, idTokenProvider);

		ImpersonatedCredentials impersonatedCredentials =
			(ImpersonatedCredentials)idTokenProvider;

		Assertions.assertEquals(
			_SERVICE_ACCOUNT, impersonatedCredentials.getAccount());
	}

	@Test
	public void testGetIdTokenProviderUsesApplicationDefaultCredentials() {
		ReflectionTestUtils.setField(
			_salesforceService, "_gcfServiceAccount", "");

		Assertions.assertSame(
			_googleCredentials,
			ReflectionTestUtils.invokeMethod(
				_salesforceService, "_getIdTokenProvider"));
	}

	@Test
	public void testGetLineItemsJSONArraySendsEachOrderItemSku() {
		Order order = new Order();

		order.setOrderItems(
			() -> new OrderItem[] {
				_createOrderItem(1, "PROD-1"), _createOrderItem(3, "PROD-2")
			});
		order.setOrderTypeExternalReferenceCode(() -> "AI_HUB_TOKEN");

		JSONArray jsonArray = _salesforceService.getLineItemsJSONArray(
			"Subscription", order);

		Assertions.assertEquals(2, jsonArray.length());

		JSONObject jsonObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals("New", jsonObject.getString("orderType"));
		Assertions.assertEquals("PROD-1", jsonObject.getString("productId"));
		Assertions.assertEquals(1, jsonObject.getInt("quantity"));

		jsonObject = jsonArray.getJSONObject(1);

		Assertions.assertEquals("PROD-2", jsonObject.getString("productId"));
		Assertions.assertEquals(3, jsonObject.getInt("quantity"));
	}

	@Test
	public void testGetRecordsListsReturnsTheRecordsInQueryOrder()
		throws Exception {

		SalesforceService salesforceService = _createSalesforceService(
			Map.of(
				"/marketplace-api/v1/jobs/query/750A",
				new ArrayDeque<>(
					List.of(
						"{\"state\": \"InProgress\"}",
						"{\"state\": \"JobComplete\"}")),
				"/marketplace-api/v1/jobs/query/750A/results",
				new ArrayDeque<>(List.of("\"Id\"\n\"001A\"\n")),
				"/marketplace-api/v1/jobs/query/750B",
				new ArrayDeque<>(List.of("{\"state\": \"JobComplete\"}")),
				"/marketplace-api/v1/jobs/query/750B/results",
				new ArrayDeque<>(List.of("\"Id\"\n\"800A\"\n\"800B\"\n"))),
			60000);

		List<List<JSONObject>> recordsLists = salesforceService.getRecordsLists(
			List.of(
				new SalesforceQuery("Account", List.of("Id"), "Id = '001A'"),
				new SalesforceQuery(
					"Contract", List.of("Id"), "AccountId = '001A'")));

		Assertions.assertEquals(2, recordsLists.size());

		List<JSONObject> accountJSONObjects = recordsLists.get(0);

		Assertions.assertEquals(1, accountJSONObjects.size());
		Assertions.assertEquals(
			"001A",
			accountJSONObjects.get(
				0
			).getString(
				"Id"
			));

		List<JSONObject> contractJSONObjects = recordsLists.get(1);

		Assertions.assertEquals(2, contractJSONObjects.size());
		Assertions.assertEquals(
			"800B",
			contractJSONObjects.get(
				1
			).getString(
				"Id"
			));

		Assertions.assertEquals(2, _postBodies.size());
		Assertions.assertEquals(
			"Id = '001A'",
			new JSONObject(
				_postBodies.get(0)
			).getString(
				"where"
			));
		Assertions.assertEquals(
			"Contract",
			new JSONObject(
				_postBodies.get(1)
			).getString(
				"object"
			));
	}

	@Test
	public void testGetRecordsListsWhenAQueryJobFails() {
		SalesforceService salesforceService = _createSalesforceService(
			Map.of(
				"/marketplace-api/v1/jobs/query/750A",
				new ArrayDeque<>(List.of("{\"state\": \"Failed\"}"))),
			60000);

		Exception exception = Assertions.assertThrows(
			Exception.class,
			() -> salesforceService.getRecordsLists(
				List.of(
					new SalesforceQuery(
						"Account", List.of("Id"), "Id = '001A'"))));

		Assertions.assertEquals(
			"Salesforce query job 750A ended in state Failed",
			exception.getMessage());
	}

	@Test
	public void testGetRecordsListsWhenTheDeadlinePasses() {
		SalesforceService salesforceService = _createSalesforceService(
			Map.of(
				"/marketplace-api/v1/jobs/query/750A",
				new ArrayDeque<>(List.of("{\"state\": \"InProgress\"}"))),
			-1);

		Exception exception = Assertions.assertThrows(
			Exception.class,
			() -> salesforceService.getRecordsLists(
				List.of(
					new SalesforceQuery(
						"Account", List.of("Id"), "Id = '001A'"))));

		Assertions.assertEquals(
			"Unable to complete Salesforce query jobs [750A]",
			exception.getMessage());
	}

	private OrderItem _createOrderItem(
		int quantity, String skuExternalReferenceCode) {

		OrderItem orderItem = new OrderItem();

		orderItem.setQuantity(() -> BigDecimal.valueOf(quantity));
		orderItem.setSkuExternalReferenceCode(() -> skuExternalReferenceCode);
		orderItem.setUnitPrice(() -> BigDecimal.TEN);

		return orderItem;
	}

	private SalesforceService _createSalesforceService(
		Map<String, Deque<String>> responses, long queryJobTimeout) {

		Deque<String> queryJobIds = new ArrayDeque<>(List.of("750A", "750B"));

		SalesforceService salesforceService = new SalesforceService() {

			@Override
			protected String get(String authorization, URI uri) {
				Deque<String> deque = responses.get(uri.getPath());

				if (deque.size() > 1) {
					return deque.poll();
				}

				return deque.peek();
			}

			@Override
			protected String post(String authorization, String body, URI uri) {
				_postBodies.add(body);

				return "{\"id\": \"" + queryJobIds.poll() + "\"}";
			}

		};

		IdTokenCredentials idTokenCredentials = Mockito.mock(
			IdTokenCredentials.class);

		Mockito.when(
			idTokenCredentials.getAccessToken()
		).thenReturn(
			new AccessToken("token", null)
		);

		ReflectionTestUtils.setField(
			salesforceService, "_gcfBaseUrl", "https://gcf.liferay.com");
		ReflectionTestUtils.setField(
			salesforceService, "_idTokenCredentials", idTokenCredentials);
		ReflectionTestUtils.setField(
			salesforceService, "_queryJobPollInterval", 0L);
		ReflectionTestUtils.setField(
			salesforceService, "_queryJobTimeout", queryJobTimeout);

		return salesforceService;
	}

	private static final String _AUDIENCE =
		"https://us-west2-is-sales.cloudfunctions.net/marketplace-api";

	private static final String _SERVICE_ACCOUNT =
		"marketplace-portal@is-sales.iam.gserviceaccount.com";

	private final GoogleCredentials _googleCredentials = Mockito.mock(
		GoogleCredentials.class,
		Mockito.withSettings(
		).extraInterfaces(
			IdTokenProvider.class
		));
	private final List<String> _postBodies = new ArrayList<>();
	private SalesforceService _salesforceService;

}