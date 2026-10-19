/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import jakarta.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-EXTERNALDXPPATHINTERCEPTOR] ExternalDXPPathInterceptor")
public class ExternalDXPPathInterceptorTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_externalDXPPathInterceptor, "_externalDXPClientId",
			_EXTERNAL_DXP_CLIENT_ID);
	}

	@AfterEach
	public void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	public void testPreHandleAllowsExternalDXPTokenOnDXPPath()
		throws Exception {

		_authenticate(_EXTERNAL_DXP_CLIENT_ID);

		MockHttpServletResponse mockHttpServletResponse =
			new MockHttpServletResponse();

		Assertions.assertTrue(
			_externalDXPPathInterceptor.preHandle(
				_createMockHttpServletRequest("/dxp/project-usage"),
				mockHttpServletResponse, null));
		Assertions.assertEquals(
			HttpServletResponse.SC_OK, mockHttpServletResponse.getStatus());
	}

	@Test
	public void testPreHandleAllowsOtherApplicationOnAnyPath()
		throws Exception {

		_authenticate("liferay-one-etc-spring-boot-oaua-client-id");

		Assertions.assertTrue(
			_externalDXPPathInterceptor.preHandle(
				_createMockHttpServletRequest("/license-keys/type-free"),
				new MockHttpServletResponse(), null));
	}

	@Test
	public void testPreHandleAllowsRequestWithoutToken() throws Exception {
		Assertions.assertTrue(
			_externalDXPPathInterceptor.preHandle(
				_createMockHttpServletRequest("/ready"),
				new MockHttpServletResponse(), null));
	}

	@Test
	public void testPreHandleRejectsExternalDXPTokenOnDXPPrefixLookalike()
		throws Exception {

		_authenticate(_EXTERNAL_DXP_CLIENT_ID);

		Assertions.assertFalse(
			_externalDXPPathInterceptor.preHandle(
				_createMockHttpServletRequest("/dxpx/project-usage"),
				new MockHttpServletResponse(), null));
	}

	@Test
	public void testPreHandleRejectsExternalDXPTokenOutsideDXPPath()
		throws Exception {

		_authenticate(_EXTERNAL_DXP_CLIENT_ID);

		MockHttpServletResponse mockHttpServletResponse =
			new MockHttpServletResponse();

		Assertions.assertFalse(
			_externalDXPPathInterceptor.preHandle(
				_createMockHttpServletRequest("/license-keys/type-free"),
				mockHttpServletResponse, null));
		Assertions.assertEquals(
			HttpServletResponse.SC_FORBIDDEN,
			mockHttpServletResponse.getStatus());
	}

	private void _authenticate(String clientId) {
		Jwt jwt = Jwt.withTokenValue(
			"token"
		).header(
			"alg", "RS256"
		).claim(
			"client_id", clientId
		).subject(
			"20123"
		).build();

		SecurityContextHolder.getContext(
		).setAuthentication(
			new JwtAuthenticationToken(jwt)
		);
	}

	private MockHttpServletRequest _createMockHttpServletRequest(
		String servletPath) {

		MockHttpServletRequest mockHttpServletRequest =
			new MockHttpServletRequest("POST", servletPath);

		mockHttpServletRequest.setServletPath(servletPath);

		return mockHttpServletRequest;
	}

	private static final String _EXTERNAL_DXP_CLIENT_ID =
		"marketplace-client-id";

	private final ExternalDXPPathInterceptor _externalDXPPathInterceptor =
		new ExternalDXPPathInterceptor();

}