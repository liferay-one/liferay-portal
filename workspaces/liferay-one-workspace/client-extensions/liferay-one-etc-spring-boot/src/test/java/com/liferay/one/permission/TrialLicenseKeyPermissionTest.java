/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.permission;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2Util;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.MockedStatic;
import org.mockito.Mockito;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
@DisplayName("[PERM-TRIALLICENSEKEYPERMISSION] TrialLicenseKeyPermission")
public class TrialLicenseKeyPermissionTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_trialLicenseKeyPermission, "_adminPermission", _adminPermission);
		ReflectionTestUtils.setField(
			_trialLicenseKeyPermission, "_lxcDXPMainDomain", "localhost:8080");
		ReflectionTestUtils.setField(
			_trialLicenseKeyPermission, "_lxcDXPServerProtocol", "http");
	}

	@AfterEach
	public void tearDown() {
		_liferayOAuth2UtilMockedStatic.close();
	}

	@Test
	public void testCheckGrantsAdministrator() throws Exception {
		_mockReleaseTeamClientId(_RELEASE_TEAM_CLIENT_ID);

		Jwt jwt = _createJwt("liferay-one-etc-spring-boot-oaua-client-id");

		Mockito.when(
			_adminPermission.contains(jwt)
		).thenReturn(
			true
		);

		_trialLicenseKeyPermission.check(jwt);
	}

	@Test
	public void testCheckGrantsReleaseTeamApplication() throws Exception {
		_mockReleaseTeamClientId(_RELEASE_TEAM_CLIENT_ID);

		_trialLicenseKeyPermission.check(_createJwt(_RELEASE_TEAM_CLIENT_ID));
		_trialLicenseKeyPermission.check(_createJwt(_RELEASE_TEAM_CLIENT_ID));

		Mockito.verifyNoInteractions(_adminPermission);

		_liferayOAuth2UtilMockedStatic.verify(
			() -> LiferayOAuth2Util.getClientId(
				"liferay-one-instance-settings-release-team-oahs",
				"localhost:8080", "http"));
	}

	@Test
	public void testCheckThrowsForUserWhoIsNotAdministrator() throws Exception {
		_mockReleaseTeamClientId(_RELEASE_TEAM_CLIENT_ID);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _trialLicenseKeyPermission.check(
				_createJwt("liferay-one-etc-spring-boot-oaua-client-id")));
	}

	@Test
	public void testIsReleaseTeamWhenReleaseTeamApplicationIsMissing() {
		_mockReleaseTeamClientId(null);

		Jwt jwt = _createJwt(_RELEASE_TEAM_CLIENT_ID);

		Assertions.assertFalse(_trialLicenseKeyPermission.isReleaseTeam(jwt));

		_mockReleaseTeamClientId(_RELEASE_TEAM_CLIENT_ID);

		Assertions.assertFalse(_trialLicenseKeyPermission.isReleaseTeam(jwt));

		_liferayOAuth2UtilMockedStatic.verify(
			() -> LiferayOAuth2Util.getClientId(
				"liferay-one-instance-settings-release-team-oahs",
				"localhost:8080", "http"));

		ReflectionTestUtils.setField(
			_trialLicenseKeyPermission, "_releaseTeamClientIdLookupTime", 0L);

		Assertions.assertTrue(_trialLicenseKeyPermission.isReleaseTeam(jwt));
	}

	private Jwt _createJwt(String clientId) {
		return Jwt.withTokenValue(
			"token"
		).header(
			"alg", "RS256"
		).claim(
			"client_id", clientId
		).build();
	}

	private void _mockReleaseTeamClientId(String clientId) {
		_liferayOAuth2UtilMockedStatic.when(
			() -> LiferayOAuth2Util.getClientId(
				"liferay-one-instance-settings-release-team-oahs",
				"localhost:8080", "http")
		).thenReturn(
			clientId
		);
	}

	private static final String _RELEASE_TEAM_CLIENT_ID =
		"release-team-client-id";

	private final AdminPermission _adminPermission = Mockito.mock(
		AdminPermission.class);
	private final MockedStatic<LiferayOAuth2Util>
		_liferayOAuth2UtilMockedStatic = Mockito.mockStatic(
			LiferayOAuth2Util.class);
	private final TrialLicenseKeyPermission _trialLicenseKeyPermission =
		new TrialLicenseKeyPermission();

}