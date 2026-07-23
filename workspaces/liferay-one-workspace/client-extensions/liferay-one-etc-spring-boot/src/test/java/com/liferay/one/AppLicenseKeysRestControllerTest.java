/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.model.LicenseKey;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.portal.ee.license.shared.LicenseConstants;

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

		_licenseKeyService = Mockito.mock(LicenseKeyService.class);

		ReflectionTestUtils.setField(
			_appLicenseKeysRestController, "_licenseKeyService",
			_licenseKeyService);
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
			licenseKey, _appLicenseKeysRestController.getAppLicenseKey(1L));
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
				() -> _appLicenseKeysRestController.getAppLicenseKey(1L));

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
			licenseKeys, _appLicenseKeysRestController.getAppLicenseKeys());

		Assertions.assertEquals(
			"productExternalId ne '" + LicenseConstants.PRODUCT_ID_PORTAL + "'",
			argumentCaptor.getValue());
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
			_appLicenseKeysRestController.getAppLicenseKeysDownload(1L);

		Assertions.assertEquals("<license/>", responseEntity.getBody());

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals(
			"attachment; filename=\"activation-key.xml\"",
			httpHeaders.getFirst(HttpHeaders.CONTENT_DISPOSITION));
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
					1L));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());
	}

	@Test
	public void testPutAppLicenseKeysActivate() throws Exception {
		_appLicenseKeysRestController.putAppLicenseKeysActivate(
			new long[] {1L, 2L});

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
	}

	@Test
	public void testPutAppLicenseKeysDeactivate() throws Exception {
		_appLicenseKeysRestController.putAppLicenseKeysDeactivate(
			new long[] {3L});

		Mockito.verify(
			_licenseKeyService
		).updateLicenseKeyActive(
			false, 3L
		);
	}

	private AppLicenseKeysRestController _appLicenseKeysRestController;
	private LicenseKeyService _licenseKeyService;

}