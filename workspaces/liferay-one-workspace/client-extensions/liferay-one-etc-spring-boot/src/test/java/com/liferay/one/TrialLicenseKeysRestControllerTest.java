/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.permission.TrialLicenseKeyPermission;
import com.liferay.one.service.TrialLicenseKeyService;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Amos Fong
 */
public class TrialLicenseKeysRestControllerTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_trialLicenseKeysRestController, "_trialLicenseKeyPermission",
			_trialLicenseKeyPermission);
		ReflectionTestUtils.setField(
			_trialLicenseKeysRestController, "_trialLicenseKeyService",
			_trialLicenseKeyService);
	}

	@Test
	public void testGetTrialLicenseKeysCMS() throws Exception {
		Mockito.when(
			_trialLicenseKeyService.getCMSTrialLicenseKeyXML(
				_LICENSE_LIFETIME, _OWNER, _START_TIME)
		).thenReturn(
			"<license>CMS</license>"
		);

		ResponseEntity<String> responseEntity =
			_trialLicenseKeysRestController.getTrialLicenseKeysCMS(
				_jwt, _LICENSE_LIFETIME, " " + _OWNER + " ", _START_TIME);

		Assertions.assertEquals(
			"<license>CMS</license>", responseEntity.getBody());
		Assertions.assertEquals(
			MediaType.APPLICATION_XML,
			responseEntity.getHeaders(
			).getContentType());

		Mockito.verify(
			_trialLicenseKeyPermission
		).check(
			_jwt
		);
	}

	@Test
	public void testGetTrialLicenseKeysDXP() throws Exception {
		Mockito.when(
			_trialLicenseKeyService.getDXPTrialLicenseKeyXML(
				_LICENSE_LIFETIME, _OWNER, _START_TIME)
		).thenReturn(
			"<license>DXP</license>"
		);

		ResponseEntity<String> responseEntity =
			_trialLicenseKeysRestController.getTrialLicenseKeysDXP(
				_jwt, _LICENSE_LIFETIME, _OWNER, _START_TIME);

		Assertions.assertEquals(
			"<license>DXP</license>", responseEntity.getBody());
		Assertions.assertEquals(
			MediaType.APPLICATION_XML,
			responseEntity.getHeaders(
			).getContentType());

		Mockito.verify(
			_trialLicenseKeyPermission
		).check(
			_jwt
		);
	}

	@Test
	public void testGetTrialLicenseKeysDXPRejectsBlankOwner() throws Exception {
		_assertBadRequest(_LICENSE_LIFETIME, " ");
	}

	@Test
	public void testGetTrialLicenseKeysDXPRejectsLicenseLifetimeOverOneYear()
		throws Exception {

		_assertBadRequest(TimeUnit.DAYS.toMillis(365) + 1, _OWNER);
	}

	@Test
	public void testGetTrialLicenseKeysDXPRejectsNonpositiveLicenseLifetime()
		throws Exception {

		_assertBadRequest(0, _OWNER);
		_assertBadRequest(-1, _OWNER);
	}

	@Test
	public void testGetTrialLicenseKeysDXPWithoutPermission() throws Exception {
		Mockito.doThrow(
			new PrincipalException()
		).when(
			_trialLicenseKeyPermission
		).check(
			_jwt
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _trialLicenseKeysRestController.getTrialLicenseKeysDXP(
				_jwt, _LICENSE_LIFETIME, _OWNER, _START_TIME));

		Mockito.verifyNoInteractions(_trialLicenseKeyService);
	}

	private void _assertBadRequest(long licenseLifetime, String owner)
		throws Exception {

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _trialLicenseKeysRestController.getTrialLicenseKeysDXP(
					_jwt, licenseLifetime, owner, _START_TIME));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verify(
			_trialLicenseKeyService, Mockito.never()
		).getDXPTrialLicenseKeyXML(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyString(),
			ArgumentMatchers.anyLong()
		);
	}

	private static final long _LICENSE_LIFETIME = TimeUnit.DAYS.toMillis(90);

	private static final String _OWNER = "docker@liferay.com";

	private static final long _START_TIME = 1794268800000L;

	private final Jwt _jwt = Jwt.withTokenValue(
		"token"
	).header(
		"alg", "RS256"
	).claim(
		"client_id", "release-client-id"
	).build();
	private final TrialLicenseKeyPermission _trialLicenseKeyPermission =
		Mockito.mock(TrialLicenseKeyPermission.class);
	private final TrialLicenseKeyService _trialLicenseKeyService = Mockito.mock(
		TrialLicenseKeyService.class);
	private final TrialLicenseKeysRestController
		_trialLicenseKeysRestController = new TrialLicenseKeysRestController();

}