/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.petra.string.StringBundler;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Limits a token issued to the external-dxp application, which a customer DXP
 * holds, to the /dxp endpoints that the DXP Marketplace calls.
 *
 * @author Ryan Schuhler
 */
@Component
public class ExternalDXPPathInterceptor implements HandlerInterceptor {

	@Override
	public boolean preHandle(
			HttpServletRequest httpServletRequest,
			HttpServletResponse httpServletResponse, Object handler)
		throws Exception {

		Authentication authentication = SecurityContextHolder.getContext(
		).getAuthentication();

		if (!(authentication instanceof
				JwtAuthenticationToken jwtAuthenticationToken)) {

			return true;
		}

		Jwt jwt = jwtAuthenticationToken.getToken();

		if (!Objects.equals(
				jwt.getClaimAsString("client_id"), _externalDXPClientId)) {

			return true;
		}

		String path = httpServletRequest.getServletPath();

		if (path.startsWith(_PATH_PREFIX_DXP)) {
			return true;
		}

		if (_log.isWarnEnabled()) {
			_log.warn(
				StringBundler.concat(
					"Refused ", httpServletRequest.getMethod(), " ", path,
					" for a token issued to the external DXP application with ",
					"subject ", jwt.getSubject()));
		}

		httpServletResponse.sendError(HttpServletResponse.SC_FORBIDDEN);

		return false;
	}

	private static final String _PATH_PREFIX_DXP = "/dxp/";

	private static final Log _log = LogFactory.getLog(
		ExternalDXPPathInterceptor.class);

	@Value("${external-dxp.oauth2.user.agent.client.id}")
	private String _externalDXPClientId;

}