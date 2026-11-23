/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import java.net.URI;

import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Wellington Barbosa
 */
@DisplayName(
	"[SVC-COMMERCEORDERSERVICE] CommerceOrderService#getAccountPlacedOrders " +
		"and #fetchAccountPlacedOrder"
)
public class CommerceOrderServicePlacedOrdersTest {

	@Test
	public void testFetchAccountPlacedOrder() throws Exception {
		TestCommerceOrderService testCommerceOrderService =
			new TestCommerceOrderService();

		testCommerceOrderService.response = "{\"accountId\":7,\"id\":5}";

		Assertions.assertEquals(
			testCommerceOrderService.response,
			testCommerceOrderService.fetchAccountPlacedOrder(7L, 5L));

		URI uri = testCommerceOrderService.uris.get(0);

		Assertions.assertEquals(
			"/o/headless-commerce-delivery-order/v1.0/placed-orders/5",
			uri.getPath());

		MultiValueMap<String, String> queryParams = _getQueryParams(uri);

		Assertions.assertEquals(
			"placedOrderItems", queryParams.getFirst("nestedFields"));
		Assertions.assertEquals(
			"-1", queryParams.getFirst("placedOrderItems.pageSize"));
	}

	@Test
	public void testFetchAccountPlacedOrderWhenTheOrderIsNotFound()
		throws Exception {

		TestCommerceOrderService testCommerceOrderService =
			new TestCommerceOrderService();

		testCommerceOrderService.webClientResponseException =
			WebClientResponseException.create(
				HttpStatus.NOT_FOUND.value(), "Not Found", HttpHeaders.EMPTY,
				new byte[0], StandardCharsets.UTF_8);

		Assertions.assertNull(
			testCommerceOrderService.fetchAccountPlacedOrder(7L, 5L));
	}

	@Test
	public void testFetchAccountPlacedOrderWhenTheOrderIsOfAnotherAccount()
		throws Exception {

		TestCommerceOrderService testCommerceOrderService =
			new TestCommerceOrderService();

		testCommerceOrderService.response = "{\"accountId\":8,\"id\":5}";

		Assertions.assertNull(
			testCommerceOrderService.fetchAccountPlacedOrder(7L, 5L));
	}

	@Test
	public void testGetAccountPlacedOrdersOmitsBlankRestrictFields()
		throws Exception {

		TestCommerceOrderService testCommerceOrderService =
			new TestCommerceOrderService();

		testCommerceOrderService.getAccountPlacedOrders(7L, 3L, 1, 20, "");

		MultiValueMap<String, String> queryParams = _getQueryParams(
			testCommerceOrderService.uris.get(0));

		Assertions.assertFalse(queryParams.containsKey("restrictFields"));
	}

	@Test
	public void testGetAccountPlacedOrdersReadsThePlacedOrdersOfTheAccount()
		throws Exception {

		TestCommerceOrderService testCommerceOrderService =
			new TestCommerceOrderService();

		Assertions.assertEquals(
			_PLACED_ORDERS,
			testCommerceOrderService.getAccountPlacedOrders(
				7L, 3L, 2, 50, "account,name"));

		Assertions.assertEquals(
			List.of("Bearer test"), testCommerceOrderService.authorizations);

		URI uri = testCommerceOrderService.uris.get(0);

		Assertions.assertEquals(
			"/o/headless-commerce-delivery-order/v1.0/channels/3/accounts/7" +
				"/placed-orders",
			uri.getPath());

		MultiValueMap<String, String> queryParams = _getQueryParams(uri);

		Assertions.assertEquals(
			"placedOrderItems", queryParams.getFirst("nestedFields"));
		Assertions.assertEquals("2", queryParams.getFirst("page"));
		Assertions.assertEquals("50", queryParams.getFirst("pageSize"));
		Assertions.assertEquals(
			"-1", queryParams.getFirst("placedOrderItems.pageSize"));
		Assertions.assertEquals(
			"account,name", queryParams.getFirst("restrictFields"));
		Assertions.assertEquals(
			"createDate:desc", queryParams.getFirst("sort"));
	}

	private MultiValueMap<String, String> _getQueryParams(URI uri) {
		return UriComponentsBuilder.fromUri(
			uri
		).build(
		).getQueryParams();
	}

	private static final String _PLACED_ORDERS =
		"{\"items\":[{\"id\":1}],\"totalCount\":1}";

	private static class TestCommerceOrderService extends CommerceOrderService {

		public final List<String> authorizations = new ArrayList<>();
		public String response = _PLACED_ORDERS;
		public final List<URI> uris = new ArrayList<>();
		public WebClientResponseException webClientResponseException;

		@Override
		protected String get(String authorization, URI uri) {
			authorizations.add(authorization);
			uris.add(uri);

			if (webClientResponseException != null) {
				throw webClientResponseException;
			}

			return response;
		}

		@Override
		protected String getAuthorization() {
			return "Bearer test";
		}

	}

}