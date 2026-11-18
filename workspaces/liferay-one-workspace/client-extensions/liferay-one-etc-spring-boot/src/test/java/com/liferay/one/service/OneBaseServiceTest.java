/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;

import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Wellington Barbosa
 */
@DisplayName("[CLS-ONEBASESERVICE] OneBaseService")
public class OneBaseServiceTest {

	@BeforeEach
	public void setUp() throws IOException {
		_httpServer = HttpServer.create(
			new InetSocketAddress("localhost", 0), 0);

		_httpServer.createContext(
			"/",
			httpExchange -> {
				InetSocketAddress inetSocketAddress =
					httpExchange.getRemoteAddress();

				_remotePorts.add(inetSocketAddress.getPort());

				_userAgents.add(
					httpExchange.getRequestHeaders(
					).getFirst(
						"User-Agent"
					));

				URI requestURI = httpExchange.getRequestURI();

				int statusCode = 200;
				String responseBody = "{}";

				if (Objects.equals(requestURI.getPath(), "/error")) {
					statusCode = 400;
					responseBody = "{\"message\": \"Order is not found\"}";
				}

				byte[] bytes = responseBody.getBytes(StandardCharsets.UTF_8);

				httpExchange.sendResponseHeaders(statusCode, bytes.length);

				try (OutputStream outputStream =
						httpExchange.getResponseBody()) {

					outputStream.write(bytes);
				}
			});

		_httpServer.start();

		InetSocketAddress inetSocketAddress = _httpServer.getAddress();

		_uri = URI.create("http://localhost:" + inetSocketAddress.getPort());
	}

	@AfterEach
	public void tearDown() {
		_httpServer.stop(0);
	}

	@Test
	public void testGetAbsoluteURL() {
		TestOneBaseService testOneBaseService = new TestOneBaseService();

		ReflectionTestUtils.setField(
			testOneBaseService, "lxcDXPMainDomain", "one.liferay.com");
		ReflectionTestUtils.setField(
			testOneBaseService, "lxcDXPServerProtocol", "https");

		Assertions.assertEquals("", testOneBaseService.getAbsoluteURL(null));
		Assertions.assertEquals(
			"//cdn.example.com/thumb.png",
			testOneBaseService.getAbsoluteURL("//cdn.example.com/thumb.png"));
		Assertions.assertEquals(
			"https://cdn.example.com/thumb.png",
			testOneBaseService.getAbsoluteURL(
				"https://cdn.example.com/thumb.png"));
		Assertions.assertEquals(
			"https://one.liferay.com/documents/thumb.png",
			testOneBaseService.getAbsoluteURL("/documents/thumb.png"));
	}

	@Test
	public void testGetAllItemsEncodesFilterAndNestedFields() throws Exception {
		TestOneBaseService testOneBaseService = new TestOneBaseService();

		testOneBaseService.getAllItems(
			"/o/headless-admin-user/v1.0/accounts",
			"name eq 'Johnson & Johnson + A=B'", jsonObject -> jsonObject,
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

	@Test
	public void testGetReusesConnection() {
		HttpOneBaseService httpOneBaseService1 = new HttpOneBaseService();

		httpOneBaseService1.doGet(_uri);
		httpOneBaseService1.doGet(_uri);

		HttpOneBaseService httpOneBaseService2 = new HttpOneBaseService();

		httpOneBaseService2.doGet(_uri);

		Assertions.assertEquals(
			1, _remotePorts.size(), _remotePorts.toString());
	}

	@Test
	public void testGetSendsUserAgent() {
		HttpOneBaseService httpOneBaseService = new HttpOneBaseService();

		httpOneBaseService.doGet(_uri);
		httpOneBaseService.doGet(_uri);

		Assertions.assertEquals(
			Set.of("liferay-one-etc-spring-boot (HttpOneBaseService)"),
			_userAgents);
	}

	@Test
	public void testGetWithResponseBody() {
		HttpOneBaseService httpOneBaseService = new HttpOneBaseService();

		WebClientResponseException webClientResponseException =
			Assertions.assertThrows(
				WebClientResponseException.class,
				() -> httpOneBaseService.doGet(_uri.resolve("/error")));

		Assertions.assertEquals(
			400,
			webClientResponseException.getStatusCode(
			).value());
		Assertions.assertEquals(
			"{\"message\": \"Order is not found\"}",
			webClientResponseException.getResponseBodyAsString());
	}

	private String _decode(String value) {
		return URLDecoder.decode(value, StandardCharsets.UTF_8);
	}

	private HttpServer _httpServer;
	private final Set<Integer> _remotePorts = ConcurrentHashMap.newKeySet();
	private URI _uri;
	private final Set<String> _userAgents = ConcurrentHashMap.newKeySet();

	private static class HttpOneBaseService extends OneBaseService {

		public String doGet(URI uri) {
			return get(Collections.emptyMap(), uri);
		}

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