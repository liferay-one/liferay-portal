/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import java.time.Instant;

import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * @author Drew Brokke
 */
public class EchoRestControllerTest {

	@BeforeEach
	public void setUp() {
		_echoRestController = new EchoRestController();
	}

	@Test
	public void testDeleteEchoReturnsTheMethod() {
		MockHttpServletRequest mockHttpServletRequest =
			new MockHttpServletRequest("DELETE", "/echo");

		_assertMethod(
			"DELETE",
			_echoRestController.deleteEcho(null, mockHttpServletRequest, null));
	}

	@Test
	public void testGetEchoHidesTheAuthorizationAndCookieValues() {
		MockHttpServletRequest mockHttpServletRequest =
			new MockHttpServletRequest("GET", "/echo");

		mockHttpServletRequest.addHeader("Authorization", "Bearer abc123");
		mockHttpServletRequest.addHeader("Cookie", "JSESSIONID=abc123");
		mockHttpServletRequest.addHeader("X-Test", "visible");

		JSONObject jsonObject = _toJSONObject(
			_echoRestController.getEcho(null, mockHttpServletRequest, null));

		JSONObject headersJSONObject = jsonObject.getJSONObject("headers");

		Assertions.assertEquals(
			"Bearer <hidden>",
			headersJSONObject.getJSONArray(
				"Authorization"
			).getString(
				0
			));
		Assertions.assertEquals(
			"<hidden>",
			headersJSONObject.getJSONArray(
				"Cookie"
			).getString(
				0
			));
		Assertions.assertEquals(
			"visible",
			headersJSONObject.getJSONArray(
				"X-Test"
			).getString(
				0
			));

		Assertions.assertFalse(
			jsonObject.toString(
			).contains(
				"abc123"
			));
	}

	@Test
	public void testGetEchoReturnsNullPrincipalWithoutToken() {
		MockHttpServletRequest mockHttpServletRequest =
			new MockHttpServletRequest("GET", "/echo");

		JSONObject jsonObject = _toJSONObject(
			_echoRestController.getEcho(null, mockHttpServletRequest, null));

		Assertions.assertTrue(jsonObject.isNull("body"));
		Assertions.assertTrue(jsonObject.isNull("principal"));
		Assertions.assertTrue(jsonObject.isNull("queryString"));
		Assertions.assertEquals(
			0,
			jsonObject.getJSONArray(
				"pathSegments"
			).length());
		Assertions.assertEquals(
			0,
			jsonObject.getJSONObject(
				"queryParameters"
			).length());
	}

	@Test
	public void testPatchEchoReturnsTheMethod() {
		MockHttpServletRequest mockHttpServletRequest =
			new MockHttpServletRequest("PATCH", "/echo");

		_assertMethod(
			"PATCH",
			_echoRestController.patchEcho(null, mockHttpServletRequest, null));
	}

	@Test
	public void testPostEchoReturnsTheRequestDetails() {
		MockHttpServletRequest mockHttpServletRequest =
			new MockHttpServletRequest("POST", "/o/one/echo/a/b%20c");

		mockHttpServletRequest.setContentType("application/json");
		mockHttpServletRequest.setContextPath("/o/one");
		mockHttpServletRequest.setQueryString("x=1&x=2&y&z=hello%20world");

		Jwt jwt = Jwt.withTokenValue(
			"token"
		).audience(
			List.of("audience")
		).claim(
			"client_id", "client"
		).claim(
			"scope", "Liferay.Headless.Admin.User.everything"
		).expiresAt(
			Instant.parse("2026-10-16T13:00:00Z")
		).header(
			"alg", "RS256"
		).issuedAt(
			Instant.parse("2026-10-16T12:00:00Z")
		).subject(
			"20123"
		).build();

		JSONObject jsonObject = _toJSONObject(
			_echoRestController.postEcho(
				"{\"a\":1}", mockHttpServletRequest, jwt));

		Assertions.assertEquals("{\"a\":1}", jsonObject.getString("body"));
		Assertions.assertEquals(
			"application/json", jsonObject.getString("contentType"));
		Assertions.assertEquals("POST", jsonObject.getString("method"));
		Assertions.assertEquals("/echo/a/b%20c", jsonObject.getString("path"));

		JSONArray pathSegmentsJSONArray = jsonObject.getJSONArray(
			"pathSegments");

		Assertions.assertEquals(2, pathSegmentsJSONArray.length());
		Assertions.assertEquals("a", pathSegmentsJSONArray.getString(0));
		Assertions.assertEquals("b c", pathSegmentsJSONArray.getString(1));

		JSONObject principalJSONObject = jsonObject.getJSONObject("principal");

		Assertions.assertEquals(
			"audience",
			principalJSONObject.getJSONArray(
				"aud"
			).getString(
				0
			));
		Assertions.assertEquals(
			"client", principalJSONObject.getString("client_id"));
		Assertions.assertEquals(
			"2026-10-16T13:00:00Z", principalJSONObject.getString("exp"));
		Assertions.assertEquals(
			"2026-10-16T12:00:00Z", principalJSONObject.getString("iat"));
		Assertions.assertEquals(
			"Liferay.Headless.Admin.User.everything",
			principalJSONObject.getString("scope"));
		Assertions.assertEquals("20123", principalJSONObject.getString("sub"));
		Assertions.assertFalse(
			principalJSONObject.toString(
			).contains(
				"token"
			));

		JSONObject queryParametersJSONObject = jsonObject.getJSONObject(
			"queryParameters");

		Assertions.assertEquals(
			"[\"1\",\"2\"]",
			queryParametersJSONObject.getJSONArray(
				"x"
			).toString());
		Assertions.assertTrue(
			queryParametersJSONObject.getJSONArray(
				"y"
			).isNull(
				0
			));
		Assertions.assertEquals(
			"hello world",
			queryParametersJSONObject.getJSONArray(
				"z"
			).getString(
				0
			));

		Assertions.assertEquals(
			"x=1&x=2&y&z=hello%20world", jsonObject.getString("queryString"));
	}

	@Test
	public void testPutEchoReturnsTheMethod() {
		MockHttpServletRequest mockHttpServletRequest =
			new MockHttpServletRequest("PUT", "/echo");

		_assertMethod(
			"PUT",
			_echoRestController.putEcho(null, mockHttpServletRequest, null));
	}

	private void _assertMethod(
		String expectedMethod, ResponseEntity<String> responseEntity) {

		Assertions.assertEquals(
			expectedMethod,
			_toJSONObject(
				responseEntity
			).getString(
				"method"
			));
	}

	private JSONObject _toJSONObject(ResponseEntity<String> responseEntity) {
		return new JSONObject(responseEntity.getBody());
	}

	private EchoRestController _echoRestController;

}