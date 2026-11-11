/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.client.extension.util.spring.boot3.service;

import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;

import java.net.InetSocketAddress;
import java.net.URI;

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
import org.junit.jupiter.api.Test;

import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import reactor.core.publisher.Mono;

/**
 * @author Allen Ziegenfus
 */
public class BaseServiceTest {

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

		_uri = "http://localhost:" + inetSocketAddress.getPort();
	}

	@AfterEach
	public void tearDown() {
		_httpServer.stop(0);
	}

	@Test
	public void testDoGetReusesConnection() {
		TestService testService1 = new TestService();

		testService1.doGet(URI.create(_uri));
		testService1.doGet(URI.create(_uri));

		TestService testService2 = new TestService();

		testService2.doGet(URI.create(_uri));

		Assertions.assertEquals(
			1, _remotePorts.size(), _remotePorts.toString());
	}

	@Test
	public void testDoGetReusesWebClient() {
		TestService testService = new TestService();

		testService.doGet(URI.create(_uri));
		testService.doGet(URI.create(_uri));

		List<ExchangeFilterFunction> exchangeFilterFunctions =
			testService.getExchangeFilterFunctions();

		Assertions.assertEquals(
			2, exchangeFilterFunctions.size(),
			exchangeFilterFunctions.toString());
		Assertions.assertSame(
			exchangeFilterFunctions.get(0), exchangeFilterFunctions.get(1));
	}

	@Test
	public void testDoGetSendsUserAgent() {
		TestService testService = new TestService();

		testService.doGet(URI.create(_uri));

		Assertions.assertEquals(
			Set.of("liferay-one-etc-spring-boot (TestService)"), _userAgents);
	}

	@Test
	public void testDoGetWithResponseBody() {
		TestService testService = new TestService();

		WebClientResponseException webClientResponseException =
			Assertions.assertThrows(
				WebClientResponseException.class,
				() -> testService.doGet(URI.create(_uri + "/error")));

		Assertions.assertEquals(
			400,
			webClientResponseException.getStatusCode(
			).value());
		Assertions.assertEquals(
			"{\"message\": \"Order is not found\"}",
			webClientResponseException.getResponseBodyAsString());
	}

	private HttpServer _httpServer;
	private final Set<Integer> _remotePorts = ConcurrentHashMap.newKeySet();
	private String _uri;
	private final Set<String> _userAgents = ConcurrentHashMap.newKeySet();

	private static class TestService extends BaseService {

		public String doGet(URI uri) {
			return get(Collections.emptyMap(), uri);
		}

		public List<ExchangeFilterFunction> getExchangeFilterFunctions() {
			return _exchangeFilterFunctions;
		}

		@Override
		protected ExchangeFilterFunction getWebClientExchangeFilterFunction() {
			ExchangeFilterFunction exchangeFilterFunction =
				super.getWebClientExchangeFilterFunction();

			return new ExchangeFilterFunction() {

				@Override
				public Mono<ClientResponse> filter(
					ClientRequest clientRequest,
					ExchangeFunction exchangeFunction) {

					_exchangeFilterFunctions.add(this);

					return exchangeFilterFunction.filter(
						clientRequest, exchangeFunction);
				}

			};
		}

		private final List<ExchangeFilterFunction> _exchangeFilterFunctions =
			new ArrayList<>();

	}

}