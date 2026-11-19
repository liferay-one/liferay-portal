/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.GetterUtil;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.security.Principal;

import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * @author Ryan Schuhler
 */
@Component
public class ImpersonationInterceptor implements HandlerInterceptor {

	@Override
	public boolean preHandle(
			HttpServletRequest httpServletRequest,
			HttpServletResponse httpServletResponse, Object handler)
		throws Exception {

		if (httpServletRequest.getDispatcherType() != DispatcherType.REQUEST) {
			return true;
		}

		long doAsUserId = GetterUtil.getLong(
			httpServletRequest.getParameter("doAsUserId"));

		if (doAsUserId <= 0) {
			return true;
		}

		String method = httpServletRequest.getMethod();

		if (HttpMethod.GET.matches(method) || HttpMethod.HEAD.matches(method) ||
			HttpMethod.OPTIONS.matches(method)) {

			return true;
		}

		String path = httpServletRequest.getServletPath();

		if (_writeEnabled && !_isBlockedPath(path)) {
			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"User ",
						_getName(httpServletRequest.getUserPrincipal()),
						" sends ", method, " ", path, " as user ", doAsUserId));
			}

			return true;
		}

		if (_log.isWarnEnabled()) {
			_log.warn(
				StringBundler.concat(
					"Refused ", method, " ", path, " while impersonating user ",
					doAsUserId));
		}

		httpServletResponse.sendError(
			HttpServletResponse.SC_FORBIDDEN,
			"This request is not available while impersonating a user");

		return false;
	}

	private String _getName(Principal principal) {
		if (principal == null) {
			return null;
		}

		return principal.getName();
	}

	private boolean _isBlockedPath(String path) {
		for (String blockedPathPattern : _blockedPathPatterns) {
			if (_antPathMatcher.match(blockedPathPattern, path)) {
				return true;
			}
		}

		return false;
	}

	private static final Log _log = LogFactory.getLog(
		ImpersonationInterceptor.class);

	private static final AntPathMatcher _antPathMatcher = new AntPathMatcher();
	private static final List<String> _blockedPathPatterns = List.of(
		"/activation-keys/generate", "/cloud/environments/*/activation",
		"/cloud/environments/*/manifest",
		"/cloud/environments/*/manual-activation",
		"/cloud/environments/*/offline-activation-bundle",
		"/cloud/environments/offline-activation",
		"/commerce-orders/*/complete-cloud-app",
		"/commerce-orders/*/complete-settled", "/console/**",
		"/digital-sales-room/provisioning/*", "/dxp/provisioning/*",
		"/entitlements/generate", "/license-keys/type-free",
		"/liferay-data-platform/provisioning/*", "/trial/**");

	@Value("${liferay.one.impersonation.write.enabled:true}")
	private boolean _writeEnabled;

}