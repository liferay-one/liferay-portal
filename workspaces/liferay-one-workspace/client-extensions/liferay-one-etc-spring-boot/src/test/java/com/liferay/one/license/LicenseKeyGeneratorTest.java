/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.portal.ee.license.shared.LicenseConstants;

import java.util.Date;
import java.util.Map;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Allen Ziegenfus
 */
@DisplayName("[CLS-LICENSEKEYGENERATOR] LicenseKeyGenerator")
public class LicenseKeyGeneratorTest {

	@Test
	public void testGenerateKeyIsDeterministic() throws Exception {
		String key1 = _generateKey();
		String key2 = _generateKey();

		Assertions.assertEquals(key1, key2);
	}

	@Test
	public void testGenerateKeyReturnsDigest() throws Exception {
		String key = _generateKey();

		Assertions.assertNotNull(key);
		Assertions.assertFalse(key.isEmpty());
	}

	@Test
	public void testGetPropertiesAddsInstanceSizeFromVersion6() {
		Map<String, String> properties = _getProperties(
			LicenseConstants.TYPE_PRODUCTION, 6, "srv-1");

		Assertions.assertEquals("Sizing 1", properties.get("instanceSize"));
	}

	@Test
	public void testGetPropertiesAddsServerInfoForClusterLicense() {
		Map<String, String> properties = _getProperties(
			LicenseConstants.TYPE_CLUSTER, 3, "srv-1");

		Assertions.assertEquals(
			"host.example.com", properties.get("hostNames"));
		Assertions.assertEquals("2", properties.get("maxServers"));
	}

	@Test
	public void testGetPropertiesBindsAVersion7ProductionLicenseToTheInstallation() {
		Map<String, String> properties = _getVersion7Properties(
			"", "BB86A2E5-5E43-37C8-9B3F-0A4D2D9DF3C1", "");

		Assertions.assertEquals(
			"BB86A2E5-5E43-37C8-9B3F-0A4D2D9DF3C1",
			properties.get("installationId"));
		Assertions.assertEquals("3", properties.get("maxClusterNodes"));
		Assertions.assertFalse(properties.containsKey("hostNames"));
		Assertions.assertFalse(properties.containsKey("ipAddresses"));
		Assertions.assertFalse(properties.containsKey("macAddresses"));
		Assertions.assertFalse(properties.containsKey("maxServers"));
		Assertions.assertFalse(properties.containsKey("serverIds"));
	}

	@Test
	public void testGetPropertiesBindsAVersion7ProductionLicenseToServers() {
		Map<String, String> properties = _getVersion7Properties(
			"host.example.com", "", "00-11-22-33-44-55");

		Assertions.assertEquals(
			"host.example.com", properties.get("hostNames"));
		Assertions.assertEquals(
			"00:11:22:33:44:55", properties.get("macAddresses"));
		Assertions.assertEquals("3", properties.get("maxClusterNodes"));
		Assertions.assertFalse(properties.containsKey("installationId"));
		Assertions.assertFalse(properties.containsKey("ipAddresses"));
		Assertions.assertFalse(properties.containsKey("maxServers"));
		Assertions.assertFalse(properties.containsKey("serverIds"));
	}

	@Test
	public void testGetPropertiesNormalizesVersion2ServerIds() {
		Map<String, String> properties = _getProperties(
			LicenseConstants.TYPE_PRODUCTION, 2, "00-11-22-AA-BB-CC");

		Assertions.assertEquals(
			"00:11:22:aa:bb:cc", properties.get("serverIds"));
		Assertions.assertFalse(properties.containsKey("hostNames"));
		Assertions.assertFalse(properties.containsKey("instanceSize"));
	}

	@Test
	public void testGetPropertiesOmitsInstanceSizeBeforeVersion6() {
		Map<String, String> properties = _getProperties(
			LicenseConstants.TYPE_PRODUCTION, 5, "srv-1");

		Assertions.assertFalse(properties.containsKey("instanceSize"));
	}

	@Test
	public void testGetPropertiesServerBindsAVersion6ProductionLicense() {
		Map<String, String> properties = _getProperties(
			LicenseConstants.TYPE_PRODUCTION, 6, "srv-1");

		Assertions.assertEquals(
			"host.example.com", properties.get("hostNames"));
		Assertions.assertEquals("2", properties.get("maxServers"));
		Assertions.assertFalse(properties.containsKey("maxClusterNodes"));
	}

	private String _generateKey() throws Exception {
		return _licenseKeyGenerator.generateKey(
			"Acme Corp", "Enterprise", LicenseConstants.TYPE_ENTERPRISE, 3,
			"Liferay DXP", LicenseConstants.PRODUCT_ID_PORTAL, "7.4",
			"Acme Corp", 0, 0, 0, 0L, 0L, "", "Test license", "",
			"host.example.com", "127.0.0.1", "00:11:22:33:44:55", "srv-1",
			new Date(1000000000000L), new Date(2000000000000L));
	}

	private Map<String, String> _getProperties(
		String licenseType, int licenseVersion, String serverIds) {

		return _licenseKeyGenerator.getProperties(
			"Acme Corp", "DXP Production", licenseType, licenseVersion,
			"DXP Production", LicenseConstants.PRODUCT_ID_PORTAL, "7.0",
			"Acme Corp", 0, 2, 0, 0L, 0L, "Sizing 1", "Test license", "",
			"host.example.com", "127.0.0.1", "00:11:22:33:44:55", serverIds,
			new Date(1000000000000L), new Date(2000000000000L));
	}

	private Map<String, String> _getVersion7Properties(
		String hostNames, String installationId, String macAddresses) {

		return _licenseKeyGenerator.getProperties(
			"Acme Corp", "DXP Production", LicenseConstants.TYPE_PRODUCTION, 7,
			"DXP Production", LicenseConstants.PRODUCT_ID_PORTAL, "2027.Q1",
			"Acme Corp", 3, 2, 0, 0L, 0L, "Sizing 4", "Test license", "",
			hostNames, installationId, "", macAddresses, "srv-1",
			new Date(1000000000000L), new Date(2000000000000L));
	}

	private final LicenseKeyGenerator _licenseKeyGenerator =
		new LicenseKeyGenerator();

}