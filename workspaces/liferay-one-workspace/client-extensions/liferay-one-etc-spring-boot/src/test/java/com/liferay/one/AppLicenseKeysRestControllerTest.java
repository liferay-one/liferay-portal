/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.model.Entitlement;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import java.time.Instant;

import java.util.Date;
import java.util.List;

import org.json.JSONObject;

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
		_entitlementService = Mockito.mock(EntitlementService.class);
		_licenseKeyService = Mockito.mock(LicenseKeyService.class);

		ReflectionTestUtils.setField(
			_appLicenseKeysRestController, "_adminPermission",
			_adminPermission);
		ReflectionTestUtils.setField(
			_appLicenseKeysRestController, "_entitlementService",
			_entitlementService);
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
			() -> _appLicenseKeysRestController.postAppLicenseKey(
				null, _toJSON("Acme description")));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _appLicenseKeysRestController.putAppLicenseKeysActivate(
				null, new long[] {1L}));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _appLicenseKeysRestController.putAppLicenseKeysDeactivate(
				null, new long[] {1L}));

		Mockito.verifyNoInteractions(_entitlementService);

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
	public void testPostAppLicenseKey() throws Exception {
		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Entitlement entitlement = Mockito.mock(Entitlement.class);

		Mockito.when(
			entitlement.getAccountEntryId()
		).thenReturn(
			77L
		);

		Mockito.when(
			_entitlementService.getEntitlement(9L)
		).thenReturn(
			entitlement
		);

		Mockito.when(
			_licenseKeyService.addLicenseKey(
				77L, "", true, "", false, "Acme description", "", 9L,
				Date.from(Instant.parse("2027-01-01T00:00:00Z")), "acme.host",
				"1.2.3.4", "", "commerce", 3, "AA:BB:CC:DD:EE:FF", 0, 0L, 0, 0,
				0L, "Acme App", "ORDER-1", "acme@example.com", "acme-app",
				"Acme App", "1.0", "", "",
				Date.from(Instant.parse("2026-01-01T00:00:00Z")))
		).thenReturn(
			licenseKey
		);

		Assertions.assertSame(
			licenseKey,
			_appLicenseKeysRestController.postAppLicenseKey(
				null, _toJSON("Acme description")));

		Mockito.verify(
			_adminPermission
		).check(
			null
		);
	}

	@Test
	public void testPostAppLicenseKeyRejectsPortalProductExternalId()
		throws Exception {

		JSONObject jsonObject = new JSONObject();

		jsonObject.put("productExternalId", LicenseConstants.PRODUCT_ID_PORTAL);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _appLicenseKeysRestController.postAppLicenseKey(
					null, jsonObject.toString()));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testPostAppLicenseKeyWhenDescriptionIsNull() throws Exception {
		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Entitlement entitlement = Mockito.mock(Entitlement.class);

		Mockito.when(
			entitlement.getAccountEntryId()
		).thenReturn(
			77L
		);

		Mockito.when(
			_entitlementService.getEntitlement(9L)
		).thenReturn(
			entitlement
		);

		Mockito.when(
			_licenseKeyService.addLicenseKey(
				77L, "", true, "", false, "acme@example.com", "", 9L,
				Date.from(Instant.parse("2027-01-01T00:00:00Z")), "acme.host",
				"1.2.3.4", "", "commerce", 3, "AA:BB:CC:DD:EE:FF", 0, 0L, 0, 0,
				0L, "Acme App", "ORDER-1", "acme@example.com", "acme-app",
				"Acme App", "1.0", "", "",
				Date.from(Instant.parse("2026-01-01T00:00:00Z")))
		).thenReturn(
			licenseKey
		);

		Assertions.assertSame(
			licenseKey,
			_appLicenseKeysRestController.postAppLicenseKey(null, _toJSON("")));
	}

	@Test
	public void testPutAppLicenseKeysActivate() throws Exception {
		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.anyLong())
		).thenReturn(
			licenseKey
		);

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
	public void testPutAppLicenseKeysActivateRejectsPortalLicense()
		throws Exception {

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getProductExternalId()
		).thenReturn(
			LicenseConstants.PRODUCT_ID_PORTAL
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.anyLong())
		).thenReturn(
			licenseKey
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _appLicenseKeysRestController.putAppLicenseKeysActivate(
					null, new long[] {1L}));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).updateLicenseKeyActive(
			Mockito.anyBoolean(), Mockito.anyLong()
		);
	}

	@Test
	public void testPutAppLicenseKeysDeactivate() throws Exception {
		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.anyLong())
		).thenReturn(
			licenseKey
		);

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

	@Test
	public void testPutAppLicenseKeysDeactivateRejectsPortalLicense()
		throws Exception {

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getProductExternalId()
		).thenReturn(
			LicenseConstants.PRODUCT_ID_PORTAL
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.anyLong())
		).thenReturn(
			licenseKey
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _appLicenseKeysRestController.putAppLicenseKeysDeactivate(
					null, new long[] {1L}));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).updateLicenseKeyActive(
			Mockito.anyBoolean(), Mockito.anyLong()
		);
	}

	private String _toJSON(String description) {
		JSONObject jsonObject = new JSONObject(
		).put(
			"description", description
		).put(
			"entitlementId", 9L
		).put(
			"expirationDate", "2027-01-01T00:00:00Z"
		).put(
			"hostName", "acme.host"
		).put(
			"ipAddresses", "1.2.3.4"
		).put(
			"licenseType", "commerce"
		).put(
			"macAddresses", "AA:BB:CC:DD:EE:FF"
		).put(
			"orderId", "ORDER-1"
		).put(
			"owner", "acme@example.com"
		).put(
			"productExternalId", "acme-app"
		).put(
			"productName", "Acme App"
		).put(
			"productVersion", "1.0"
		).put(
			"startDate", "2026-01-01T00:00:00Z"
		);

		return jsonObject.toString();
	}

	private AdminPermission _adminPermission;
	private AppLicenseKeysRestController _appLicenseKeysRestController;
	private EntitlementService _entitlementService;
	private LicenseKeyService _licenseKeyService;

}