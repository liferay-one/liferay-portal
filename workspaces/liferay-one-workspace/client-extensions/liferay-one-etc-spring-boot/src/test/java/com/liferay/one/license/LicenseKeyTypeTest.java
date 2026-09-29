/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.portal.kernel.util.HashMapBuilder;

import java.io.InputStream;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class LicenseKeyTypeTest {

	@BeforeEach
	public void setUp() {
		_licenseKeyTypeService = new LicenseKeyTypeService();

		_setTypes(
			HashMapBuilder.put(
				"PRDCT-CLOUD-NATIVE", "production,non-production,uat"
			).put(
				"PRDCT-DXP",
				"production,non-production,developer,developer-cluster," +
					"backup,oem,enterprise,free"
			).put(
				"PRDCT-PORTAL",
				"production,non-production,developer,developer-cluster," +
					"backup,oem,enterprise"
			).build());
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
			_toKeys("PRDCT-CLOUD-NATIVE"));
	}

	@Test
	public void testGetLicenseKeyTypesForDXP() {
		Assertions.assertEquals(
			Arrays.asList(
				"production", "non-production", "developer",
				"developer-cluster", "backup", "oem", "enterprise", "free"),
			_toKeys("PRDCT-DXP"));
	}

	@Test
	public void testBindsTypesFromConfiguration() throws Exception {

		// The map is keyed by product external reference code, which carries
		// characters Spring relaxes elsewhere, so bind it the way the running
		// application does rather than trusting the setter alone.

		Properties properties = new Properties();

		try (InputStream inputStream =
				LicenseKeyTypeTest.class.getResourceAsStream(
					"/application-default.properties")) {

			properties.load(inputStream);
		}

		Map<String, Object> source = new HashMap<>();

		for (String name : properties.stringPropertyNames()) {
			if (name.startsWith("liferay.one.license.key.types")) {
				source.put(
					name,
					properties.getProperty(
						name
					).replaceAll(
						"\\$\\{[^:]+:(.*)\\}", "$1"
					));
			}
		}

		Assertions.assertFalse(source.isEmpty());

		LicenseKeyTypeService licenseKeyTypeService =
			new LicenseKeyTypeService();

		Binder binder = new Binder(new MapConfigurationPropertySource(source));

		binder.bind(
			"liferay.one.license.key",
			Bindable.ofInstance(licenseKeyTypeService));

		ReflectionTestUtils.invokeMethod(licenseKeyTypeService, "init");

		Map<String, String> types = licenseKeyTypeService.getTypes();

		Assertions.assertTrue(types.containsKey("PRDCT-CLOUD-NATIVE"));
		Assertions.assertTrue(types.containsKey("PRDCT-PORTAL"));

		List<String> keys = new ArrayList<>();

		for (LicenseKeyType licenseKeyType :
				licenseKeyTypeService.getLicenseKeyTypes(
					"PRDCT-CLOUD-NATIVE")) {

			keys.add(licenseKeyType.getKey());
		}

		Assertions.assertTrue(keys.contains("developer"));
	}

	@Test
	public void testGetLicenseKeyTypesForProductAddedByConfiguration() {

		// A product is offered by naming it in configuration, so nothing in
		// code has to change to add one.

		_setTypes(
			HashMapBuilder.put(
				"PRDCT-NOT-SHIPPED", "developer"
			).build());

		Assertions.assertEquals(
			Arrays.asList("developer"), _toKeys("PRDCT-NOT-SHIPPED"));
	}

	@Test
	public void testGetLicenseKeyTypesForUnknownProduct() {
		Assertions.assertEquals(
			new ArrayList<String>(), _toKeys("PRDCT-DOES-NOT-EXIST"));
	}

	@Test
	public void testInitIgnoresUnknownKey() {
		_setTypes(
			HashMapBuilder.put(
				"PRDCT-DXP", "production,bogus,,backup"
			).build());

		Assertions.assertEquals(
			Arrays.asList("production", "backup"), _toKeys("PRDCT-DXP"));
	}

	@Test
	public void testInitPreservesConfiguredOrder() {
		_setTypes(
			HashMapBuilder.put(
				"PRDCT-DXP", "free,backup,production"
			).build());

		Assertions.assertEquals(
			Arrays.asList("free", "backup", "production"),
			_toKeys("PRDCT-DXP"));
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

		// Virtual cluster entries are recognised so an administrator can issue
		// one; the key type itself is what is withheld from customers.

		Assertions.assertEquals(
			LicenseKeyType.VIRTUAL_CLUSTER,
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

	private void _setTypes(Map<String, String> types) {
		_licenseKeyTypeService.setTypes(types);

		ReflectionTestUtils.invokeMethod(_licenseKeyTypeService, "init");
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