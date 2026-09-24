/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import java.net.URI;
import java.net.URLDecoder;

import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Wellington Barbosa
 */
public class OneBaseServiceTest {

	@Test
	public void testGetAllItemsEncodesFilterAndNestedFields() throws Exception {
		TestOneBaseService testOneBaseService = new TestOneBaseService();

		testOneBaseService.getAllItems(
			"/o/headless-admin-user/v1.0/accounts",
			"name eq 'Johnson & Johnson + A=B'", jsonObject -> jsonObject, null,
			"postalAddresses,accountRoles");

		Assertions.assertEquals(1, testOneBaseService.uris.size());

		URI uri = testOneBaseService.uris.get(0);

		String rawQuery = uri.getRawQuery();

		Assertions.assertFalse(rawQuery.contains("Johnson & Johnson"));

		UriComponentsBuilder uriComponentsBuilder =
			UriComponentsBuilder.fromUri(uri);

		UriComponents uriComponents = uriComponentsBuilder.build();

		MultiValueMap<String, String> queryParams =
			uriComponents.getQueryParams();

		Assertions.assertEquals(
			"name eq 'Johnson & Johnson + A=B'",
			_decode(queryParams.getFirst("filter")));
		Assertions.assertEquals(
			"postalAddresses,accountRoles",
			_decode(queryParams.getFirst("nestedFields")));
	}

	@Test
	public void testGetAllItemsWithoutFilter() throws Exception {
		TestOneBaseService testOneBaseService = new TestOneBaseService();

		testOneBaseService.getAllItems(
			"/o/c/licensekeys", null, jsonObject -> jsonObject);

		URI uri = testOneBaseService.uris.get(0);

		String rawQuery = uri.getRawQuery();

		Assertions.assertFalse(rawQuery.contains("filter"));
	}

	private String _decode(String value) {
		return URLDecoder.decode(value, StandardCharsets.UTF_8);
	}

	private static class TestOneBaseService extends OneBaseService {

		public final List<URI> uris = new ArrayList<>();

		@Override
		protected String get(String authorization, URI uri) {
			uris.add(uri);

			return "{\"items\": []}";
		}

		@Override
		protected String getAuthorization(Jwt jwt) {
			return "Bearer test";
		}

	}

}