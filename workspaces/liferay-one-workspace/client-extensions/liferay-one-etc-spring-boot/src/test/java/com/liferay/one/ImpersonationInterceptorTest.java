/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-IMPERSONATIONINTERCEPTOR] ImpersonationInterceptor")
public class ImpersonationInterceptorTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_impersonationInterceptor, "_writeEnabled", true);
	}

	@Test
	public void testPreHandleAllowsReadRequestWhileImpersonating()
		throws Exception {

		ReflectionTestUtils.setField(
			_impersonationInterceptor, "_writeEnabled", false);

		for (String method : new String[] {"GET", "HEAD", "OPTIONS"}) {
			_assertAllowed(method, "/trial/provisioning/1", "200");
		}
	}

	@Test
	public void testPreHandleAllowsErrorDispatchWhileImpersonating()
		throws Exception {

		ReflectionTestUtils.setField(
			_impersonationInterceptor, "_writeEnabled", false);

		MockHttpServletRequest mockHttpServletRequest =
			_createMockHttpServletRequest("POST", "/error", "200");

		mockHttpServletRequest.setDispatcherType(DispatcherType.ERROR);

		MockHttpServletResponse mockHttpServletResponse =
			new MockHttpServletResponse();

		Assertions.assertTrue(
			_impersonationInterceptor.preHandle(
				mockHttpServletRequest, mockHttpServletResponse, null));
		Assertions.assertEquals(
			HttpServletResponse.SC_OK, mockHttpServletResponse.getStatus());
	}

	@Test
	public void testPreHandleAllowsWriteRequestWhileImpersonating()
		throws Exception {

		for (String method : new String[] {"DELETE", "PATCH", "POST", "PUT"}) {
			_assertAllowed(method, "/accounts/ACCNT-1/invitations", "200");
		}

		_assertAllowed("POST", "/cloud/environments/activation-request", "200");
		_assertAllowed(
			"POST", "/cloud/environments/offline-activation/token-validation",
			"200");
		_assertAllowed("POST", "/commerce-orders/1/calculate-tax", "200");
		_assertAllowed("POST", "/license-keys/type-free-domains-check", "200");
	}

	@Test
	public void testPreHandleAllowsWriteRequestWithoutDoAsUserID()
		throws Exception {

		ReflectionTestUtils.setField(
			_impersonationInterceptor, "_writeEnabled", false);

		_assertAllowed("POST", "/trial/provisioning/1", null);
		_assertAllowed("POST", "/trial/provisioning/1", "0");
	}

	@Test
	public void testPreHandleRefusesBlockedWriteRequestWhileImpersonating()
		throws Exception {

		for (String path :
				new String[] {
					"/activation-keys/generate",
					"/cloud/environments/1/activation",
					"/cloud/environments/1/manifest",
					"/cloud/environments/1/manual-activation",
					"/cloud/environments/1/offline-activation-bundle",
					"/cloud/environments/offline-activation",
					"/commerce-orders/1/complete-cloud-app",
					"/commerce-orders/1/complete-settled",
					"/console/provisioning/1", "/console/uninstall-app/1",
					"/digital-sales-room/provisioning/1", "/dxp/provisioning/1",
					"/entitlements/generate", "/license-keys/type-free",
					"/liferay-data-platform/provisioning/1", "/trial/1",
					"/trial/expire/1", "/trial/extend/1",
					"/trial/provisioning/1"
				}) {

			_assertRefused("POST", path);
		}

		_assertRefused("DELETE", "/trial/1");
	}

	@Test
	public void testPreHandleRefusesWriteRequestWhenWriteIsDisabled()
		throws Exception {

		ReflectionTestUtils.setField(
			_impersonationInterceptor, "_writeEnabled", false);

		for (String method : new String[] {"DELETE", "PATCH", "POST", "PUT"}) {
			_assertRefused(method, "/accounts/ACCNT-1/invitations");
		}
	}

	private void _assertAllowed(String method, String path, String doAsUserId)
		throws Exception {

		MockHttpServletResponse mockHttpServletResponse =
			new MockHttpServletResponse();

		Assertions.assertTrue(
			_impersonationInterceptor.preHandle(
				_createMockHttpServletRequest(method, path, doAsUserId),
				mockHttpServletResponse, null));
		Assertions.assertEquals(
			HttpServletResponse.SC_OK, mockHttpServletResponse.getStatus());
	}

	private void _assertRefused(String method, String path) throws Exception {
		MockHttpServletResponse mockHttpServletResponse =
			new MockHttpServletResponse();

		Assertions.assertFalse(
			_impersonationInterceptor.preHandle(
				_createMockHttpServletRequest(method, path, "200"),
				mockHttpServletResponse, null),
			path);
		Assertions.assertEquals(
			HttpServletResponse.SC_FORBIDDEN,
			mockHttpServletResponse.getStatus());
	}

	private MockHttpServletRequest _createMockHttpServletRequest(
		String method, String path, String doAsUserId) {

		MockHttpServletRequest mockHttpServletRequest =
			new MockHttpServletRequest(method, path);

		mockHttpServletRequest.setServletPath(path);

		if (doAsUserId != null) {
			mockHttpServletRequest.setParameter("doAsUserId", doAsUserId);
		}

		return mockHttpServletRequest;
	}

	private final ImpersonationInterceptor _impersonationInterceptor =
		new ImpersonationInterceptor();

}