/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.IdToken;
import com.google.auth.oauth2.IdTokenCredentials;
import com.google.auth.oauth2.IdTokenProvider;
import com.google.auth.oauth2.ImpersonatedCredentials;

import com.liferay.one.exception.DataOpsUnavailableException;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;

import java.net.InetAddress;
import java.net.InetSocketAddress;

import java.nio.charset.StandardCharsets;

import java.time.Instant;

import java.util.Base64;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Veloso
 */
public class DataOpsUsageServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_httpServer = HttpServer.create(
			new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);

		_httpServer.createContext(
			"/",
			httpExchange -> {
				_requestURI.set(String.valueOf(httpExchange.getRequestURI()));
				_requestAuthorization.set(
					httpExchange.getRequestHeaders(
					).getFirst(
						"Authorization"
					));

				_respond(httpExchange);
			});

		_httpServer.start();

		IdTokenProvider idTokenProvider = (IdTokenProvider)_googleCredentials;

		Mockito.when(
			idTokenProvider.idTokenWithAudience(
				Mockito.anyString(), Mockito.any())
		).thenAnswer(
			invocation -> {
				if (_idTokenException != null) {
					throw _idTokenException;
				}

				return IdToken.create(
					_createIdTokenValue(invocation.getArgument(0)));
			}
		);

		_dataOpsUsageService = new DataOpsUsageService();

		InetSocketAddress inetSocketAddress = _httpServer.getAddress();

		ReflectionTestUtils.setField(
			_dataOpsUsageService, "_gcfBaseURL",
			"http://localhost:" + inetSocketAddress.getPort());

		ReflectionTestUtils.setField(
			_dataOpsUsageService, "_googleCredentials", _googleCredentials);

		_ldpBaseURL =
			"http://localhost:" + inetSocketAddress.getPort() + _LDP_ROOT_PATH;

		ReflectionTestUtils.setField(
			_dataOpsUsageService, "_ldpBaseURL", _ldpBaseURL);
	}

	@AfterEach
	public void tearDown() {
		_httpServer.stop(0);
	}

	@Test
	public void testFetchLDPProjectEventHistory() throws Exception {
		_responseBody = _EVENT_HISTORY_RESPONSE;

		Assertions.assertEquals(
			_EVENT_HISTORY_RESPONSE,
			_dataOpsUsageService.fetchLDPProjectEventHistory(
				"2026-08-31", "month", _SALESFORCE_PROJECT_ID, "2026-06-01"));

		String requestURI = _requestURI.get();

		Assertions.assertTrue(
			requestURI.startsWith(
				StringBundler.concat(
					_LDP_ROOT_PATH, "/api/v1/projects/", _SALESFORCE_PROJECT_ID,
					"/ldp/usage/event-history")));
		Assertions.assertTrue(requestURI.contains("endDate=2026-08-31"));
		Assertions.assertTrue(requestURI.contains("granularity=month"));
		Assertions.assertTrue(requestURI.contains("startDate=2026-06-01"));
	}

	@Test
	public void testFetchLDPProjectEventSummary() throws Exception {
		_responseBody = _EVENT_SUMMARY_RESPONSE;

		Assertions.assertEquals(
			_EVENT_SUMMARY_RESPONSE,
			_dataOpsUsageService.fetchLDPProjectEventSummary(
				"2026-08-31", _SALESFORCE_PROJECT_ID, "2026-06-01"));

		String requestURI = _requestURI.get();

		Assertions.assertTrue(
			requestURI.startsWith(
				StringBundler.concat(
					_LDP_ROOT_PATH, "/api/v1/projects/", _SALESFORCE_PROJECT_ID,
					"/ldp/usage/event-summary")));
		Assertions.assertTrue(requestURI.contains("endDate=2026-08-31"));
		Assertions.assertTrue(requestURI.contains("startDate=2026-06-01"));
	}

	@Test
	public void testFetchLDPProjectUsage() throws Exception {
		_responseBody = _USAGE_RESPONSE;

		Assertions.assertEquals(
			_USAGE_RESPONSE,
			_dataOpsUsageService.fetchLDPProjectUsage(_SALESFORCE_PROJECT_ID));
		Assertions.assertEquals(
			StringBundler.concat(
				_LDP_ROOT_PATH, "/api/v1/projects/", _SALESFORCE_PROJECT_ID,
				"/ldp/usage"),
			_requestURI.get());
	}

	@Test
	public void testFetchLDPProjectUsageSendsBearerAuthorization()
		throws Exception {

		_responseBody = _USAGE_RESPONSE;

		_dataOpsUsageService.fetchLDPProjectUsage(_SALESFORCE_PROJECT_ID);

		String authorization = _requestAuthorization.get();

		Assertions.assertTrue(authorization.startsWith(_BEARER_PREFIX + "eyJ"));

		Assertions.assertTrue(
			_decodeIdTokenPayload(
				authorization
			).contains(
				"\"aud\": \"" + _ldpBaseURL + "\""
			));
	}

	@Test
	public void testFetchLDPProjectUsageWhenIdTokenProviderFails() {
		_idTokenException = new IOException("Unable to mint an ID token");

		DataOpsUnavailableException dataOpsUnavailableException =
			Assertions.assertThrows(
				DataOpsUnavailableException.class,
				() -> _dataOpsUsageService.fetchLDPProjectUsage(
					_SALESFORCE_PROJECT_ID));

		Assertions.assertEquals(
			"Unable to authenticate to DataOps for project " +
				_SALESFORCE_PROJECT_ID,
			dataOpsUnavailableException.getMessage());

		Assertions.assertNull(_requestURI.get());
	}

	@Test
	public void testFetchLDPProjectUsageWhenResponseIsNotFound()
		throws Exception {

		_responseStatus = 404;

		Assertions.assertNull(
			_dataOpsUsageService.fetchLDPProjectUsage(_SALESFORCE_PROJECT_ID));
	}

	@Test
	public void testFetchLDPProjectUsageWhenResponseIsServerError() {
		_responseStatus = 500;

		DataOpsUnavailableException dataOpsUnavailableException =
			Assertions.assertThrows(
				DataOpsUnavailableException.class,
				() -> _dataOpsUsageService.fetchLDPProjectUsage(
					_SALESFORCE_PROJECT_ID));

		Assertions.assertEquals(
			"Unable to read DataOps usage for project " +
				_SALESFORCE_PROJECT_ID,
			dataOpsUnavailableException.getMessage());
	}

	@Test
	public void testGetIdTokenCredentialsCachesOneInstancePerAudience() {
		Assertions.assertSame(
			_getIdTokenCredentials(_AUDIENCE_COMPOSABLE),
			_getIdTokenCredentials(_AUDIENCE_COMPOSABLE));
	}

	@Test
	public void testGetIdTokenCredentialsSeparatesAudiences() {
		Assertions.assertNotSame(
			_getIdTokenCredentials(_AUDIENCE_COMPOSABLE),
			_getIdTokenCredentials(_AUDIENCE_CUSTOMER));
	}

	@Test
	public void testGetIdTokenProviderImpersonatesTheConfiguredAccount() {
		IdTokenProvider idTokenProvider = ReflectionTestUtils.invokeMethod(
			_dataOpsUsageService, "_getIdTokenProvider", _SERVICE_ACCOUNT);

		Assertions.assertInstanceOf(
			ImpersonatedCredentials.class, idTokenProvider);

		ImpersonatedCredentials impersonatedCredentials =
			(ImpersonatedCredentials)idTokenProvider;

		Assertions.assertEquals(
			_SERVICE_ACCOUNT, impersonatedCredentials.getAccount());
	}

	@Test
	public void testGetIdTokenProviderReusesImpersonatedCredentials() {
		Assertions.assertSame(
			ReflectionTestUtils.invokeMethod(
				_dataOpsUsageService, "_getIdTokenProvider", _SERVICE_ACCOUNT),
			ReflectionTestUtils.invokeMethod(
				_dataOpsUsageService, "_getIdTokenProvider", _SERVICE_ACCOUNT));
	}

	@Test
	public void testGetIdTokenProviderUsesApplicationDefaultCredentials() {
		Assertions.assertSame(
			_googleCredentials,
			ReflectionTestUtils.invokeMethod(
				_dataOpsUsageService, "_getIdTokenProvider", ""));
	}

	private String _decodeIdTokenPayload(String authorization) {
		String token = authorization.substring(_BEARER_PREFIX.length());

		int begin = token.indexOf('.') + 1;

		Base64.Decoder decoder = Base64.getUrlDecoder();

		return new String(
			decoder.decode(token.substring(begin, token.indexOf('.', begin))),
			StandardCharsets.UTF_8);
	}

	private String _createIdTokenValue(String audience) {
		Base64.Encoder encoder = Base64.getUrlEncoder(
		).withoutPadding();

		String header = encoder.encodeToString(
			"{\"alg\": \"RS256\", \"typ\": \"JWT\"}".getBytes(
				StandardCharsets.UTF_8));

		Instant instant = Instant.now();

		String payload = encoder.encodeToString(
			StringBundler.concat(
				"{\"aud\": \"", audience, "\", \"exp\": ",
				instant.getEpochSecond() + 3600, ", \"iat\": ",
				instant.getEpochSecond(),
				", \"iss\": \"https://accounts.google.com\", \"sub\": \"1\"}"
			).getBytes(
				StandardCharsets.UTF_8
			));

		String signature = encoder.encodeToString(
			"signature".getBytes(StandardCharsets.UTF_8));

		return StringBundler.concat(header, ".", payload, ".", signature);
	}

	private IdTokenCredentials _getIdTokenCredentials(String audience) {
		return ReflectionTestUtils.invokeMethod(
			_dataOpsUsageService, "_getIdTokenCredentials", audience,
			StringPool.BLANK);
	}

	private void _respond(HttpExchange httpExchange) throws IOException {
		byte[] bytes = _responseBody.getBytes(StandardCharsets.UTF_8);

		httpExchange.getResponseHeaders(
		).set(
			"Content-Type", "application/json"
		);

		httpExchange.sendResponseHeaders(_responseStatus, bytes.length);

		try (OutputStream outputStream = httpExchange.getResponseBody()) {
			outputStream.write(bytes);
		}
	}

	private static final String _AUDIENCE_COMPOSABLE =
		"https://example.com/composable_usage_api";

	private static final String _AUDIENCE_CUSTOMER =
		"https://example.com/customer_usage_api";

	private static final String _BEARER_PREFIX = "Bearer ";

	private static final String _EVENT_HISTORY_RESPONSE =
		"{\"eventHistory\": [{\"date\": \"2026-06-01\"}]}";

	private static final String _EVENT_SUMMARY_RESPONSE =
		"{\"eventSummary\": [{\"eventsCount\": 13000}]}";

	private static final String _LDP_ROOT_PATH = "/ldp-root";

	private static final String _SALESFORCE_PROJECT_ID = "a0B0g00000eABCD123";

	private static final String _SERVICE_ACCOUNT =
		"dataops-invoker@liferay-dw-infra.iam.gserviceaccount.com";

	private static final String _USAGE_RESPONSE =
		"{\"apiRequestsCount\": 45000}";

	private DataOpsUsageService _dataOpsUsageService;
	private final GoogleCredentials _googleCredentials = Mockito.mock(
		GoogleCredentials.class,
		Mockito.withSettings(
		).extraInterfaces(
			IdTokenProvider.class
		));
	private HttpServer _httpServer;
	private IOException _idTokenException;
	private String _ldpBaseURL;
	private final AtomicReference<String> _requestAuthorization =
		new AtomicReference<>();
	private final AtomicReference<String> _requestURI = new AtomicReference<>();
	private volatile String _responseBody = "{}";
	private volatile int _responseStatus = 200;

}