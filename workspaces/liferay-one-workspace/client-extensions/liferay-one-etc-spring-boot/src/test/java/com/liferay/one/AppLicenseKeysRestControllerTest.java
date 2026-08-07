/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.model.LicenseKey;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Allen Ziegenfus
 */
public class AppLicenseKeysRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_appLicenseKeysRestController = new AppLicenseKeysRestController();

		_adminPermission = Mockito.mock(AdminPermission.class);
		_licenseKeyService = Mockito.mock(LicenseKeyService.class);

		ReflectionTestUtils.setField(
			_appLicenseKeysRestController, "_adminPermission",
			_adminPermission);
		ReflectionTestUtils.setField(
			_appLicenseKeysRestController, "_licenseKeyService",
			_licenseKeyService);
	}

	@Test
	public void testAppLicenseKeysWhenAdminPermissionIsDenied()
		throws Exception {

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_adminPermission
		).check(
			null
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _appLicenseKeysRestController.getAppLicenseKeys(null));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _appLicenseKeysRestController.getAppLicenseKey(null, 1L));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _appLicenseKeysRestController.getAppLicenseKeysDownload(
				null, 1L));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _appLicenseKeysRestController.putAppLicenseKeysActivate(
				null, new long[] {1L}));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _appLicenseKeysRestController.putAppLicenseKeysDeactivate(
				null, new long[] {1L}));

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGetAppLicenseKey() throws Exception {
		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getProductExternalId()
		).thenReturn(
			"commerce"
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(1L)
		).thenReturn(
			licenseKey
		);

		Assertions.assertSame(
			licenseKey,
			_appLicenseKeysRestController.getAppLicenseKey(null, 1L));

		Mockito.verify(
			_adminPermission
		).check(
			null
		);
	}

	@Test
	public void testGetAppLicenseKeyRejectsPortalLicense() throws Exception {
		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getProductExternalId()
		).thenReturn(
			LicenseConstants.PRODUCT_ID_PORTAL
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(1L)
		).thenReturn(
			licenseKey
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _appLicenseKeysRestController.getAppLicenseKey(null, 1L));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());
	}

	@Test
	public void testGetAppLicenseKeys() throws Exception {
		ArgumentCaptor<String> argumentCaptor = ArgumentCaptor.forClass(
			String.class);

		List<LicenseKey> licenseKeys = List.of(Mockito.mock(LicenseKey.class));

		Mockito.when(
			_licenseKeyService.getLicenseKeys(argumentCaptor.capture())
		).thenReturn(
			licenseKeys
		);

		Assertions.assertSame(
			licenseKeys, _appLicenseKeysRestController.getAppLicenseKeys(null));

		Assertions.assertEquals(
			"productExternalId ne '" + LicenseConstants.PRODUCT_ID_PORTAL + "'",
			argumentCaptor.getValue());

		Mockito.verify(
			_adminPermission
		).check(
			null
		);
	}

	@Test
	public void testGetAppLicenseKeysDownload() throws Exception {
		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getProductExternalId()
		).thenReturn(
			"commerce"
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(1L)
		).thenReturn(
			licenseKey
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeyDownloadFileName(licenseKey)
		).thenReturn(
			"activation-key.xml"
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeyDownloadXML(licenseKey)
		).thenReturn(
			"<license/>"
		);

		ResponseEntity<String> responseEntity =
			_appLicenseKeysRestController.getAppLicenseKeysDownload(null, 1L);

		Assertions.assertEquals("<license/>", responseEntity.getBody());

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals(
			"attachment; filename=\"activation-key.xml\"",
			httpHeaders.getFirst(HttpHeaders.CONTENT_DISPOSITION));

		Mockito.verify(
			_adminPermission
		).check(
			null
		);
	}

	@Test
	public void testGetAppLicenseKeysDownloadRejectsPortalLicense()
		throws Exception {

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getProductExternalId()
		).thenReturn(
			LicenseConstants.PRODUCT_ID_PORTAL
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(1L)
		).thenReturn(
			licenseKey
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _appLicenseKeysRestController.getAppLicenseKeysDownload(
					null, 1L));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());
	}

	@Test
	public void testPutAppLicenseKeysActivate() throws Exception {
		_appLicenseKeysRestController.putAppLicenseKeysActivate(
			null, new long[] {1L, 2L});

		Mockito.verify(
			_licenseKeyService
		).updateLicenseKeyActive(
			true, 1L
		);

		Mockito.verify(
			_licenseKeyService
		).updateLicenseKeyActive(
			true, 2L
		);

		Mockito.verify(
			_adminPermission
		).check(
			null
		);
	}

	@Test
	public void testPutAppLicenseKeysDeactivate() throws Exception {
		_appLicenseKeysRestController.putAppLicenseKeysDeactivate(
			null, new long[] {3L});

		Mockito.verify(
			_licenseKeyService
		).updateLicenseKeyActive(
			false, 3L
		);

		Mockito.verify(
			_adminPermission
		).check(
			null
		);
	}

	private AdminPermission _adminPermission;
	private AppLicenseKeysRestController _appLicenseKeysRestController;
	private LicenseKeyService _licenseKeyService;

}