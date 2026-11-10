/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.permission.TrialLicenseKeyPermission;

import jakarta.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
@DisplayName("[CLS-RELEASETEAMPATHINTERCEPTOR] ReleaseTeamPathInterceptor")
public class ReleaseTeamPathInterceptorTest {

	@BeforeEach
	public void setUp() {
		Mockito.when(
			_trialLicenseKeyPermission.isReleaseTeam(ArgumentMatchers.any())
		).thenAnswer(
			invocation -> {
				Jwt jwt = invocation.getArgument(0);

				return _RELEASE_TEAM_CLIENT_ID.equals(
					jwt.getClaimAsString("client_id"));
			}
		);

		ReflectionTestUtils.setField(
			_releaseTeamPathInterceptor, "_trialLicenseKeyPermission",
			_trialLicenseKeyPermission);
	}

	@AfterEach
	public void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	public void testPreHandleAllowsOtherApplicationOnAnyPath()
		throws Exception {

		_authenticate("liferay-one-etc-spring-boot-oaua-client-id");

		Assertions.assertTrue(
			_releaseTeamPathInterceptor.preHandle(
				_createMockHttpServletRequest("/common-license-keys"),
				new MockHttpServletResponse(), null));
	}

	@Test
	public void testPreHandleAllowsReleaseTeamTokenOnTrialLicenseKeysPath()
		throws Exception {

		_authenticate(_RELEASE_TEAM_CLIENT_ID);

		MockHttpServletResponse mockHttpServletResponse =
			new MockHttpServletResponse();

		Assertions.assertTrue(
			_releaseTeamPathInterceptor.preHandle(
				_createMockHttpServletRequest("/trial-license-keys/dxp"),
				mockHttpServletResponse, null));
		Assertions.assertEquals(
			HttpServletResponse.SC_OK, mockHttpServletResponse.getStatus());
	}

	@Test
	public void testPreHandleAllowsRequestWithoutToken() throws Exception {
		Assertions.assertTrue(
			_releaseTeamPathInterceptor.preHandle(
				_createMockHttpServletRequest("/ready"),
				new MockHttpServletResponse(), null));

		Mockito.verifyNoInteractions(_trialLicenseKeyPermission);
	}

	@Test
	public void testPreHandleRejectsReleaseTeamTokenOnPrefixLookalike()
		throws Exception {

		_authenticate(_RELEASE_TEAM_CLIENT_ID);

		Assertions.assertFalse(
			_releaseTeamPathInterceptor.preHandle(
				_createMockHttpServletRequest("/trial-license-keysx/dxp"),
				new MockHttpServletResponse(), null));
	}

	@Test
	public void testPreHandleRejectsReleaseTeamTokenOutsideTrialLicenseKeysPath()
		throws Exception {

		_authenticate(_RELEASE_TEAM_CLIENT_ID);

		MockHttpServletResponse mockHttpServletResponse =
			new MockHttpServletResponse();

		Assertions.assertFalse(
			_releaseTeamPathInterceptor.preHandle(
				_createMockHttpServletRequest("/common-license-keys"),
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
			"20404"
		).build();

		SecurityContextHolder.getContext(
		).setAuthentication(
			new JwtAuthenticationToken(jwt)
		);
	}

	private MockHttpServletRequest _createMockHttpServletRequest(
		String servletPath) {

		MockHttpServletRequest mockHttpServletRequest =
			new MockHttpServletRequest("GET", servletPath);

		mockHttpServletRequest.setServletPath(servletPath);

		return mockHttpServletRequest;
	}

	private static final String _RELEASE_TEAM_CLIENT_ID =
		"release-team-client-id";

	private final ReleaseTeamPathInterceptor _releaseTeamPathInterceptor =
		new ReleaseTeamPathInterceptor();
	private final TrialLicenseKeyPermission _trialLicenseKeyPermission =
		Mockito.mock(TrialLicenseKeyPermission.class);

}