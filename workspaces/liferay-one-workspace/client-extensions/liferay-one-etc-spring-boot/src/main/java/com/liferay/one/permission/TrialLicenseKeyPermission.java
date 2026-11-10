/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.permission;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2Util;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.util.Validator;

import java.util.Objects;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class TrialLicenseKeyPermission {

	public void check(Jwt jwt) throws Exception {
		if (!contains(jwt)) {
			throw new PrincipalException();
		}
	}

	public boolean contains(Jwt jwt) throws Exception {
		if (isReleaseTeam(jwt)) {
			return true;
		}

		return _adminPermission.contains(jwt);
	}

	public boolean isReleaseTeam(Jwt jwt) {
		String clientId = _getReleaseTeamClientId();

		if (Validator.isNotNull(clientId) &&
			Objects.equals(clientId, jwt.getClaimAsString("client_id"))) {

			return true;
		}

		return false;
	}

	private String _getReleaseTeamClientId() {
		String clientId = _releaseTeamClientId;

		if (clientId != null) {
			return clientId;
		}

		long time = System.currentTimeMillis();

		if ((time - _releaseTeamClientIdLookupTime) < _LOOKUP_INTERVAL) {
			return null;
		}

		_releaseTeamClientIdLookupTime = time;

		_releaseTeamClientId = LiferayOAuth2Util.getClientId(
			_EXTERNAL_REFERENCE_CODE_RELEASE_TEAM, _lxcDXPMainDomain,
			_lxcDXPServerProtocol);

		return _releaseTeamClientId;
	}

	private static final String _EXTERNAL_REFERENCE_CODE_RELEASE_TEAM =
		"liferay-one-instance-settings-release-team-oahs";

	private static final long _LOOKUP_INTERVAL = TimeUnit.MINUTES.toMillis(5);

	@Autowired
	private AdminPermission _adminPermission;

	@Value("${com.liferay.lxc.dxp.mainDomain}")
	private String _lxcDXPMainDomain;

	@Value("${com.liferay.lxc.dxp.server.protocol}")
	private String _lxcDXPServerProtocol;

	private volatile String _releaseTeamClientId;
	private volatile long _releaseTeamClientIdLookupTime;

}