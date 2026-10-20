/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import java.io.InputStream;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-LICENSEKEYTYPE] LicenseKeyType")
public class LicenseKeyTypeTest {

	@BeforeEach
	public void setUp() {
		_licenseKeyTypeService = new LicenseKeyTypeService();

		_setTypes(
			"production,non-production,uat,developer,developer-cluster," +
				"backup,oem,enterprise,free");
	}

	@Test
	public void testBindsTypesFromConfiguration() throws Exception {
		Properties properties = new Properties();

		try (InputStream inputStream =
				LicenseKeyTypeTest.class.getResourceAsStream(
					"/application-default.properties")) {

			properties.load(inputStream);
		}

		Map<String, Object> source = new HashMap<>();

		for (String name : properties.stringPropertyNames()) {
			if (!name.startsWith("liferay.one.license.key.types")) {
				continue;
			}

			source.put(
				name,
				properties.getProperty(
					name
				).replaceAll(
					"\\$\\{[^:]+:(.*)\\}", "$1"
				));
		}

		Assertions.assertFalse(source.isEmpty());

		LicenseKeyTypeService licenseKeyTypeService =
			new LicenseKeyTypeService();

		Binder binder = new Binder(new MapConfigurationPropertySource(source));

		binder.bind(
			"liferay.one.license.key",
			Bindable.ofInstance(licenseKeyTypeService));

		ReflectionTestUtils.invokeMethod(licenseKeyTypeService, "init");

		String types = licenseKeyTypeService.getTypes();

		Assertions.assertFalse(types.isEmpty());

		List<String> keys = new ArrayList<>();

		for (LicenseKeyType licenseKeyType :
				licenseKeyTypeService.getLicenseKeyTypes()) {

			keys.add(licenseKeyType.getKey());
		}

		Assertions.assertTrue(keys.contains("developer"));
		Assertions.assertEquals("production", keys.get(0));
	}

	@Test
	public void testFetchLicenseKeyTypeOfVirtualClusterEntry() {
		Assertions.assertEquals(
			LicenseKeyType.BACKUP,
			LicenseKeyType.fetchLicenseKeyType(
				_toLicenseEntry(
					"DXP Backup (Virtual Cluster)", "virtual-cluster")));
		Assertions.assertEquals(
			LicenseKeyType.NON_PRODUCTION,
			LicenseKeyType.fetchLicenseKeyType(
				_toLicenseEntry(
					"DXP Non-Production (Virtual Cluster)",
					"virtual-cluster")));
		Assertions.assertEquals(
			LicenseKeyType.PRODUCTION,
			LicenseKeyType.fetchLicenseKeyType(
				_toLicenseEntry(
					"DXP Production (Virtual Cluster)", "virtual-cluster")));
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
	public void testInitIgnoresUnknownKey() {
		_setTypes("production,bogus,,backup");

		Assertions.assertEquals(
			Arrays.asList("production", "backup"), _toKeys());
	}

	@Test
	public void testInitPreservesConfiguredOrder() {
		_setTypes("free,backup,production");

		Assertions.assertEquals(
			Arrays.asList("free", "backup", "production"), _toKeys());
	}

	@Test
	public void testIsVirtualClusterSupported() {
		Assertions.assertTrue(
			LicenseKeyType.BACKUP.isVirtualClusterSupported());
		Assertions.assertTrue(
			LicenseKeyType.NON_PRODUCTION.isVirtualClusterSupported());
		Assertions.assertTrue(
			LicenseKeyType.PRODUCTION.isVirtualClusterSupported());

		Assertions.assertFalse(
			LicenseKeyType.COMPLIMENTARY.isVirtualClusterSupported());
		Assertions.assertFalse(
			LicenseKeyType.DEVELOPER.isVirtualClusterSupported());
		Assertions.assertFalse(
			LicenseKeyType.DEVELOPER_CLUSTER.isVirtualClusterSupported());
		Assertions.assertFalse(LicenseKeyType.FREE.isVirtualClusterSupported());
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
	public void testMatchesOnlyItsOwnVirtualClusterEntry() {
		LicenseEntry backupLicenseEntry = _toLicenseEntry(
			"DXP Backup (Virtual Cluster)", "virtual-cluster");
		LicenseEntry nonproductionLicenseEntry = _toLicenseEntry(
			"DXP Non-Production (Virtual Cluster)", "virtual-cluster");
		LicenseEntry productionLicenseEntry = _toLicenseEntry(
			"DXP Production (Virtual Cluster)", "virtual-cluster");

		Assertions.assertTrue(
			LicenseKeyType.BACKUP.matches(backupLicenseEntry, true));
		Assertions.assertFalse(
			LicenseKeyType.BACKUP.matches(nonproductionLicenseEntry, true));
		Assertions.assertFalse(
			LicenseKeyType.BACKUP.matches(productionLicenseEntry, true));

		Assertions.assertFalse(
			LicenseKeyType.NON_PRODUCTION.matches(backupLicenseEntry, true));
		Assertions.assertTrue(
			LicenseKeyType.NON_PRODUCTION.matches(
				nonproductionLicenseEntry, true));
		Assertions.assertFalse(
			LicenseKeyType.NON_PRODUCTION.matches(
				productionLicenseEntry, true));

		Assertions.assertFalse(
			LicenseKeyType.PRODUCTION.matches(backupLicenseEntry, true));
		Assertions.assertFalse(
			LicenseKeyType.PRODUCTION.matches(nonproductionLicenseEntry, true));
		Assertions.assertTrue(
			LicenseKeyType.PRODUCTION.matches(productionLicenseEntry, true));
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
	public void testMatchesVirtualClusterEntryOnlyAsVirtualCluster() {
		LicenseEntry licenseEntry = _toLicenseEntry(
			"DXP Production (Virtual Cluster)", "virtual-cluster");

		Assertions.assertFalse(
			LicenseKeyType.PRODUCTION.matches(licenseEntry, false));

		Assertions.assertFalse(
			LicenseKeyType.PRODUCTION.matches(
				_toLicenseEntry("DXP Production", "production"), true));
	}

	@Test
	public void testUATMatchesNoLicenseEntry() {
		Assertions.assertFalse(
			LicenseKeyType.UAT.matches(
				_toLicenseEntry("Cloud Native UAT", "production"), false));
	}

	private void _setTypes(String types) {
		_licenseKeyTypeService.setTypes(types);

		ReflectionTestUtils.invokeMethod(_licenseKeyTypeService, "init");
	}

	private List<String> _toKeys() {
		List<String> keys = new ArrayList<>();

		for (LicenseKeyType licenseKeyType :
				_licenseKeyTypeService.getLicenseKeyTypes()) {

			keys.add(licenseKeyType.getKey());
		}

		return keys;
	}

	private LicenseEntry _toLicenseEntry(String name, String type) {
		return new LicenseEntry("KOR-00000", name, type, null, null);
	}

	private LicenseKeyTypeService _licenseKeyTypeService;

}