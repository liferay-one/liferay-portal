/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.one.constants.LicenseKeyGenerationConstants;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class LicenseKeyTypeTest {

	@BeforeEach
	public void setUp() {
		_licenseKeyTypeService = new LicenseKeyTypeService();

		_setKeys(
			"_cloudNativeKeys",
			Arrays.asList("production", "non-production", "uat"));
		_setKeys(
			"_dxpKeys",
			Arrays.asList(
				"production", "non-production", "developer",
				"developer-cluster", "backup", "oem", "enterprise", "free"));
		_setKeys(
			"_portalKeys",
			Arrays.asList(
				"production", "non-production", "developer",
				"developer-cluster", "backup", "oem", "enterprise"));

		ReflectionTestUtils.invokeMethod(_licenseKeyTypeService, "init");
	}

	@Test
	public void testFetchLicenseKeyTypeWithAdditionalJVMName() {
		Assertions.assertNull(
			LicenseKeyType.fetchLicenseKeyType(
				_toLicenseEntry(
					"Portal Production (Additional JVM)", "production")));
	}

	@Test
	public void testFetchLicenseKeyTypeWithClusterName() {
		Assertions.assertNull(
			LicenseKeyType.fetchLicenseKeyType(
				_toLicenseEntry("Portal Backup (Cluster)", "cluster")));
	}

	@Test
	public void testFetchLicenseKeyTypeWithKey() {
		Assertions.assertEquals(
			LicenseKeyType.DEVELOPER_CLUSTER,
			LicenseKeyType.fetchLicenseKeyType("developer-cluster"));
	}

	@Test
	public void testFetchLicenseKeyTypeWithLegacyLabel() {
		Assertions.assertNull(
			LicenseKeyType.fetchLicenseKeyType("Developer Cluster"));
	}

	@Test
	public void testGetLicenseKeyTypesForCloudNative() {
		Assertions.assertEquals(
			Arrays.asList("production", "non-production", "uat"),
			_toKeys(
				LicenseKeyGenerationConstants.
					PRODUCT_EXTERNAL_REFERENCE_CODE_CLOUD_NATIVE));
	}

	@Test
	public void testGetLicenseKeyTypesForDXP() {
		Assertions.assertEquals(
			Arrays.asList(
				"production", "non-production", "developer",
				"developer-cluster", "backup", "oem", "enterprise", "free"),
			_toKeys(
				LicenseKeyGenerationConstants.
					PRODUCT_EXTERNAL_REFERENCE_CODE_DXP));
	}

	@Test
	public void testGetLicenseKeyTypesForUnknownProduct() {
		Assertions.assertEquals(
			new ArrayList<String>(), _toKeys("PRDCT-DOES-NOT-EXIST"));
	}

	@Test
	public void testInitIgnoresUnknownKey() {
		_setKeys(
			"_dxpKeys", Arrays.asList("production", "bogus", "", "backup"));

		ReflectionTestUtils.invokeMethod(_licenseKeyTypeService, "init");

		Assertions.assertEquals(
			Arrays.asList("production", "backup"),
			_toKeys(
				LicenseKeyGenerationConstants.
					PRODUCT_EXTERNAL_REFERENCE_CODE_DXP));
	}

	@Test
	public void testInitPreservesConfiguredOrder() {
		_setKeys("_dxpKeys", Arrays.asList("free", "backup", "production"));

		ReflectionTestUtils.invokeMethod(_licenseKeyTypeService, "init");

		Assertions.assertEquals(
			Arrays.asList("free", "backup", "production"),
			_toKeys(
				LicenseKeyGenerationConstants.
					PRODUCT_EXTERNAL_REFERENCE_CODE_DXP));
	}

	@Test
	public void testMatchesDistinguishesNonproductionFromProduction() {
		LicenseEntry licenseEntry = _toLicenseEntry(
			"DXP Non-Production", "production");

		Assertions.assertEquals(
			LicenseKeyType.NON_PRODUCTION,
			LicenseKeyType.fetchLicenseKeyType(licenseEntry));
	}

	@Test
	public void testMatchesDistinguishesProductionTypesByName() {
		Assertions.assertEquals(
			LicenseKeyType.BACKUP,
			LicenseKeyType.fetchLicenseKeyType(
				_toLicenseEntry("DXP Backup", "production")));
		Assertions.assertEquals(
			LicenseKeyType.PRODUCTION,
			LicenseKeyType.fetchLicenseKeyType(
				_toLicenseEntry("DXP Production", "production")));
	}

	@Test
	public void testMatchesFreeSharesNameWithProduction() {
		Assertions.assertEquals(
			LicenseKeyType.FREE,
			LicenseKeyType.fetchLicenseKeyType(
				_toLicenseEntry("DXP Production", "free")));
	}

	@Test
	public void testMatchesIgnoresProductionTypedEnterpriseName() {
		Assertions.assertNull(
			LicenseKeyType.fetchLicenseKeyType(
				_toLicenseEntry("Portal Enterprise", "production")));
	}

	@Test
	public void testMatchesRenamedDeveloperAndEnterpriseNames() {
		Assertions.assertEquals(
			LicenseKeyType.DEVELOPER,
			LicenseKeyType.fetchLicenseKeyType(
				_toLicenseEntry("DXP Development", "developer")));
		Assertions.assertEquals(
			LicenseKeyType.ENTERPRISE,
			LicenseKeyType.fetchLicenseKeyType(
				_toLicenseEntry(
					"DXP Unlimited Enterprise-Wide", "enterprise")));
	}

	@Test
	public void testMatchesVirtualClusterName() {
		Assertions.assertNull(
			LicenseKeyType.fetchLicenseKeyType(
				_toLicenseEntry(
					"DXP Production (Virtual Cluster)", "virtual-cluster")));
	}

	@Test
	public void testUATMatchesNoLicenseEntry() {
		Assertions.assertFalse(
			LicenseKeyType.UAT.matches(
				_toLicenseEntry("Cloud Native UAT", "production")));
	}

	private void _setKeys(String fieldName, List<String> keys) {
		ReflectionTestUtils.setField(_licenseKeyTypeService, fieldName, keys);
	}

	private List<String> _toKeys(String externalReferenceCode) {
		List<String> keys = new ArrayList<>();

		for (LicenseKeyType licenseKeyType :
				_licenseKeyTypeService.getLicenseKeyTypes(
					externalReferenceCode)) {

			keys.add(licenseKeyType.getKey());
		}

		return keys;
	}

	private LicenseEntry _toLicenseEntry(String name, String type) {
		return new LicenseEntry("KOR-00000", name, type, null, null);
	}

	private LicenseKeyTypeService _licenseKeyTypeService;

}