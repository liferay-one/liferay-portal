/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-LICENSEKEYTYPESERVICE] LicenseKeyTypeService")
public class LicenseKeyTypeServiceTest {

	@Test
	public void testInitParsesTypesAndAdminTypes() {
		LicenseKeyTypeService licenseKeyTypeService =
			_createLicenseKeyTypeService(
				"oem, complimentary", " production ,,developer,unknown");

		Assertions.assertEquals(
			List.of(LicenseKeyType.PRODUCTION, LicenseKeyType.DEVELOPER),
			licenseKeyTypeService.getLicenseKeyTypes());
		Assertions.assertTrue(
			licenseKeyTypeService.isAdminType(LicenseKeyType.OEM));
		Assertions.assertTrue(
			licenseKeyTypeService.isAdminType(LicenseKeyType.COMPLIMENTARY));
		Assertions.assertFalse(
			licenseKeyTypeService.isAdminType(LicenseKeyType.PRODUCTION));
		Assertions.assertEquals(
			"oem, complimentary", licenseKeyTypeService.getAdminTypes());
		Assertions.assertEquals(
			" production ,,developer,unknown",
			licenseKeyTypeService.getTypes());
	}

	@Test
	public void testInitReturnsEmptyListsForBlankTypes() {
		LicenseKeyTypeService licenseKeyTypeService =
			_createLicenseKeyTypeService("", null);

		Assertions.assertTrue(
			licenseKeyTypeService.getLicenseKeyTypes(
			).isEmpty());
		Assertions.assertFalse(
			licenseKeyTypeService.isAdminType(LicenseKeyType.OEM));
		Assertions.assertThrows(
			UnsupportedOperationException.class,
			() -> licenseKeyTypeService.getLicenseKeyTypes(
			).add(
				LicenseKeyType.FREE
			));
	}

	@Test
	public void testIsAdminTypeIsFalseBeforeInit() {
		LicenseKeyTypeService licenseKeyTypeService =
			new LicenseKeyTypeService();

		Assertions.assertFalse(
			licenseKeyTypeService.isAdminType(LicenseKeyType.OEM));
		Assertions.assertTrue(
			licenseKeyTypeService.getLicenseKeyTypes(
			).isEmpty());
	}

	private LicenseKeyTypeService _createLicenseKeyTypeService(
		String adminTypes, String types) {

		LicenseKeyTypeService licenseKeyTypeService =
			new LicenseKeyTypeService();

		licenseKeyTypeService.setAdminTypes(adminTypes);
		licenseKeyTypeService.setTypes(types);

		ReflectionTestUtils.invokeMethod(licenseKeyTypeService, "init");

		return licenseKeyTypeService;
	}

}