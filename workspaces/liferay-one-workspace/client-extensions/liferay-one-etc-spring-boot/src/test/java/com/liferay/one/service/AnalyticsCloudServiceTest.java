/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.sun.net.httpserver.HttpServer;

import java.io.OutputStream;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;

import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.http.HttpHeaders;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-ANALYTICSCLOUDSERVICE] AnalyticsCloudService")
public class AnalyticsCloudServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_httpServer = HttpServer.create(new InetSocketAddress(0), 0);

		_httpServer.createContext(
			"/o/faro/main/project/provisioned",
			httpExchange -> {
				_authorizations.add(
					httpExchange.getRequestHeaders(
					).getFirst(
						HttpHeaders.AUTHORIZATION
					));
				_formBodies.add(
					new String(
						httpExchange.getRequestBody(
						).readAllBytes(),
						StandardCharsets.UTF_8));

				byte[] bytes = _provisionResponse.getBytes(
					StandardCharsets.UTF_8);

				httpExchange.sendResponseHeaders(
					_provisionStatusCode, bytes.length);

				try (OutputStream outputStream =
						httpExchange.getResponseBody()) {

					outputStream.write(bytes);
				}
			});

		_httpServer.start();

		InetSocketAddress inetSocketAddress = _httpServer.getAddress();

		String url = "http://localhost:" + inetSocketAddress.getPort();

		ReflectionTestUtils.setField(
			_testAnalyticsCloudService, "_analyticsCloudAuthEmailAddress",
			"external@example.com");
		ReflectionTestUtils.setField(
			_testAnalyticsCloudService, "_analyticsCloudAuthPassword",
			"external-password");
		ReflectionTestUtils.setField(
			_testAnalyticsCloudService, "_analyticsCloudAuthUrl", url);
		ReflectionTestUtils.setField(
			_testAnalyticsCloudService,
			"_analyticsCloudInternalAuthEmailAddress", "internal@example.com");
		ReflectionTestUtils.setField(
			_testAnalyticsCloudService, "_analyticsCloudInternalAuthPassword",
			"internal-password");
		ReflectionTestUtils.setField(
			_testAnalyticsCloudService, "_analyticsCloudInternalAuthUrl", url);
	}

	@AfterEach
	public void tearDown() {
		_httpServer.stop(0);
	}

	@Test
	public void testGetContextJSONObjectRoutesByEnvironment() {
		JSONObject externalJSONObject =
			_testAnalyticsCloudService.getAnalyticsCloudContextJSONObject(
				"external");

		Assertions.assertEquals(
			"external@example.com",
			externalJSONObject.getString("emailAddress"));
		Assertions.assertEquals(
			"external-password", externalJSONObject.getString("password"));

		JSONObject internalJSONObject =
			_testAnalyticsCloudService.getAnalyticsCloudContextJSONObject(
				"internal");

		Assertions.assertEquals(
			"internal@example.com",
			internalJSONObject.getString("emailAddress"));
		Assertions.assertEquals(
			"internal-password", internalJSONObject.getString("password"));
	}

	@Test
	public void testGetProjectJSONObjectReturnsNullOnError() {
		_testAnalyticsCloudService._webClientResponseException =
			WebClientResponseException.create(
				404, "Not Found", HttpHeaders.EMPTY,
				"missing".getBytes(StandardCharsets.UTF_8),
				StandardCharsets.UTF_8);

		Assertions.assertNull(
			_testAnalyticsCloudService.getAnalyticsCloudProjectJSONObject(
				"external", "uuid-1"));
	}

	@Test
	public void testGetProjectJSONObjectReturnsNullWithoutGroupId() {
		_testAnalyticsCloudService._response = "{\"groupId\": 0}";

		Assertions.assertNull(
			_testAnalyticsCloudService.getAnalyticsCloudProjectJSONObject(
				"external", "uuid-1"));
	}

	@Test
	public void testGetProjectJSONObjectReturnsProvisionedProject() {
		_testAnalyticsCloudService._response = "{\"groupId\": 7}";

		JSONObject jsonObject =
			_testAnalyticsCloudService.getAnalyticsCloudProjectJSONObject(
				"internal", "uuid-1");

		Assertions.assertEquals(7, jsonObject.getInt("groupId"));

		Assertions.assertEquals(
			_basic("internal@example.com:internal-password"),
			_testAnalyticsCloudService._authorization);
		Assertions.assertEquals(
			"/o/faro/main/project/corpProjectUuid/uuid-1",
			_testAnalyticsCloudService._uri.getPath());
	}

	@Test
	public void testProvisionExternal() throws Exception {
		JSONObject jsonObject =
			_testAnalyticsCloudService.provisionAnalyticsCloudProject(
				"external", _createAnalyticsCloudProjectJSONObject(), "uuid-1");

		Assertions.assertEquals(7, jsonObject.getInt("groupId"));

		Assertions.assertEquals(
			_basic("external@example.com:external-password"),
			_authorizations.get(0));

		Map<String, String> form = _parseForm(_formBodies.get(0));

		Assertions.assertEquals("Project One", form.get("corpProjectName"));
		Assertions.assertEquals("uuid-1", form.get("corpProjectUuid"));
		Assertions.assertEquals("true", form.get("enableAutoConfiguration"));
		Assertions.assertEquals(
			"[\"ops@example.com\"]", form.get("incidentReportEmailAddresses"));
		Assertions.assertEquals("us-east1", form.get("serverLocation"));
		Assertions.assertEquals("false", form.get("sharedCluster"));
		Assertions.assertEquals("false", form.get("trial"));
	}

	@Test
	public void testProvisionInternalUsesUATServerLocation() throws Exception {
		_testAnalyticsCloudService.provisionAnalyticsCloudProject(
			"internal", _createAnalyticsCloudProjectJSONObject(), "uuid-1");

		Assertions.assertEquals(
			_basic("internal@example.com:internal-password"),
			_authorizations.get(0));

		Map<String, String> form = _parseForm(_formBodies.get(0));

		Assertions.assertEquals(
			"us-west1-ac-uat-c1", form.get("serverLocation"));
	}

	@Test
	public void testProvisionRethrowsWebClientResponseException() {
		_provisionResponse = "failure";
		_provisionStatusCode = 500;

		Assertions.assertThrows(
			WebClientResponseException.class,
			() -> _testAnalyticsCloudService.provisionAnalyticsCloudProject(
				"external", _createAnalyticsCloudProjectJSONObject(),
				"uuid-1"));
	}

	private String _basic(String credentials) {
		Base64.Encoder encoder = Base64.getEncoder();

		String encodedCredentials = encoder.encodeToString(
			credentials.getBytes(StandardCharsets.UTF_8));

		return "Basic " + encodedCredentials;
	}

	private JSONObject _createAnalyticsCloudProjectJSONObject() {
		return new JSONObject(
		).put(
			"corpProjectName", "Project One"
		).put(
			"friendlyURL", "/project-one"
		).put(
			"incidentReportEmailAddresses",
			new JSONArray(
			).put(
				"ops@example.com"
			)
		).put(
			"name", "Project One"
		).put(
			"ownerEmailAddress", "owner@example.com"
		).put(
			"serverLocation", "us-east1"
		);
	}

	private Map<String, String> _parseForm(String formBody) {
		Map<String, String> form = new HashMap<>();

		for (String pair : formBody.split("&")) {
			String[] parts = pair.split("=", 2);

			form.put(
				URLDecoder.decode(parts[0], StandardCharsets.UTF_8),
				URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
		}

		return form;
	}

	private final List<String> _authorizations = new ArrayList<>();
	private final List<String> _formBodies = new ArrayList<>();
	private HttpServer _httpServer;
	private String _provisionResponse = "{\"groupId\": 7}";
	private int _provisionStatusCode = 200;
	private final TestAnalyticsCloudService _testAnalyticsCloudService =
		new TestAnalyticsCloudService();

	private static class TestAnalyticsCloudService
		extends AnalyticsCloudService {

		@Override
		protected String get(String authorization, URI uri) {
			_authorization = authorization;
			_uri = uri;

			if (_webClientResponseException != null) {
				throw _webClientResponseException;
			}

			return _response;
		}

		private String _authorization;
		private String _response;
		private URI _uri;
		private WebClientResponseException _webClientResponseException;

	}

}