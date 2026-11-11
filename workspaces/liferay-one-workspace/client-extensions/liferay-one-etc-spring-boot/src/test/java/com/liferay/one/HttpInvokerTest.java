/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;

import java.lang.reflect.Method;

import java.net.InetSocketAddress;
import java.net.URI;

import java.nio.charset.StandardCharsets;

import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * @author Allen Ziegenfus
 */
public class HttpInvokerTest {

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
					statusCode = 404;
					responseBody = "{\"status\": \"NOT_FOUND\"}";
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
	public void testInvokeReusesConnection() throws Exception {
		for (String clientName : _CLIENT_NAMES) {
			_remotePorts.clear();
			_userAgents.clear();

			Assertions.assertEquals(200, _invoke(clientName, _uri));
			Assertions.assertEquals(404, _invoke(clientName, _uri + "/error"));
			Assertions.assertEquals(200, _invoke(clientName, _uri));

			Assertions.assertEquals(
				1, _remotePorts.size(), clientName + " " + _remotePorts);
			Assertions.assertEquals(
				Set.of("liferay-one-etc-spring-boot (" + clientName + ")"),
				_userAgents);
		}
	}

	private int _invoke(String clientName, String path) throws Exception {
		Class<?> clazz = Class.forName(
			"com.liferay." + clientName.replace('-', '.') +
				".http.HttpInvoker");

		Method newHttpInvokerMethod = clazz.getMethod("newHttpInvoker");

		Object httpInvoker = newHttpInvokerMethod.invoke(null);

		Method pathMethod = clazz.getMethod("path", String.class);

		pathMethod.invoke(httpInvoker, path);

		Method invokeMethod = clazz.getMethod("invoke");

		Object httpResponse = invokeMethod.invoke(httpInvoker);

		Class<?> httpResponseClass = httpResponse.getClass();

		Method getStatusCodeMethod = httpResponseClass.getMethod(
			"getStatusCode");

		return (int)getStatusCodeMethod.invoke(httpResponse);
	}

	private static final String[] _CLIENT_NAMES = {
		"headless-admin-address-client", "headless-admin-user-client",
		"headless-commerce-admin-catalog-client",
		"headless-commerce-admin-channel-client",
		"headless-commerce-admin-order-client",
		"headless-commerce-admin-pricing-client",
		"headless-portal-instances-client", "notification-rest-client"
	};

	private HttpServer _httpServer;
	private final Set<Integer> _remotePorts = ConcurrentHashMap.newKeySet();
	private String _uri;
	private final Set<String> _userAgents = ConcurrentHashMap.newKeySet();

}