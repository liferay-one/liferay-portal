/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.IdTokenCredentials;
import com.google.auth.oauth2.IdTokenProvider;
import com.google.auth.oauth2.ImpersonatedCredentials;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;

import java.math.BigDecimal;

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
		ReflectionTestUtils.setField(
			_salesforceService, "_gcfServiceAccountKey", "");

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

	private OrderItem _createOrderItem(
		int quantity, String skuExternalReferenceCode) {

		OrderItem orderItem = new OrderItem();

		orderItem.setQuantity(() -> BigDecimal.valueOf(quantity));
		orderItem.setSkuExternalReferenceCode(() -> skuExternalReferenceCode);
		orderItem.setUnitPrice(() -> BigDecimal.TEN);

		return orderItem;
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
	private SalesforceService _salesforceService;

}