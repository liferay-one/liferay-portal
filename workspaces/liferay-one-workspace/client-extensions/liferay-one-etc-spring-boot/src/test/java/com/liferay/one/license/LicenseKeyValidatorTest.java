/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.one.exception.DuplicateIPAddressException;
import com.liferay.one.exception.DuplicateMACAddressException;
import com.liferay.one.exception.LicenseKeyDateException;
import com.liferay.one.exception.LicenseKeyDescriptionException;
import com.liferay.one.exception.LicenseKeyIPAddressException;
import com.liferay.one.exception.LicenseKeyMACAddressException;
import com.liferay.one.exception.LicenseKeyMaxClusterNodesException;
import com.liferay.one.exception.LicenseKeyNameException;
import com.liferay.one.exception.LicenseKeyOwnerException;
import com.liferay.one.exception.LicenseKeyProductVersionException;
import com.liferay.one.exception.LicenseKeyServerInfoException;
import com.liferay.portal.ee.license.shared.LicenseConstants;

import java.util.Date;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Allen Ziegenfus
 */
public class LicenseKeyValidatorTest {

	@Test
	public void testValidateDatesExpirationBeforeStart() {
		Assertions.assertThrows(
			LicenseKeyDateException.class,
			() -> _licenseKeyValidator.validateDates(
				new Date(1000), null, null, LicenseConstants.TYPE_ENTERPRISE,
				null, new Date(2000)));
	}

	@Test
	public void testValidateDatesNullExpirationDate() {
		Assertions.assertThrows(
			LicenseKeyDateException.class,
			() -> _licenseKeyValidator.validateDates(
				null, null, null, LicenseConstants.TYPE_ENTERPRISE, null,
				new Date(1000)));
	}

	@Test
	public void testValidateDatesNullStartDate() {
		Assertions.assertThrows(
			LicenseKeyDateException.class,
			() -> _licenseKeyValidator.validateDates(
				new Date(1000), null, null, LicenseConstants.TYPE_ENTERPRISE,
				null, null));
	}

	@Test
	public void testValidateDatesValid() {
		Assertions.assertDoesNotThrow(
			() -> _licenseKeyValidator.validateDates(
				new Date(2000), null, null, LicenseConstants.TYPE_ENTERPRISE,
				null, new Date(1000)));
	}

	@Test
	public void testValidateMetadataInvalidDescription() {
		Assertions.assertThrows(
			LicenseKeyDescriptionException.class,
			() -> _licenseKeyValidator.validateMetadata(
				null, LicenseConstants.TYPE_ENTERPRISE, 0, "name", "owner",
				"7.4"));
	}

	@Test
	public void testValidateMetadataInvalidMaxClusterNodes() {
		Assertions.assertThrows(
			LicenseKeyMaxClusterNodesException.class,
			() -> _licenseKeyValidator.validateMetadata(
				"description", LicenseConstants.TYPE_VIRTUAL_CLUSTER, 0, "name",
				"owner", "7.4"));
	}

	@Test
	public void testValidateMetadataInvalidName() {
		Assertions.assertThrows(
			LicenseKeyNameException.class,
			() -> _licenseKeyValidator.validateMetadata(
				"description", LicenseConstants.TYPE_ENTERPRISE, 0, null,
				"owner", "7.4"));
	}

	@Test
	public void testValidateMetadataInvalidOwner() {
		Assertions.assertThrows(
			LicenseKeyOwnerException.class,
			() -> _licenseKeyValidator.validateMetadata(
				"description", LicenseConstants.TYPE_ENTERPRISE, 0, "name",
				null, "7.4"));
	}

	@Test
	public void testValidateMetadataInvalidProductVersion() {
		Assertions.assertThrows(
			LicenseKeyProductVersionException.class,
			() -> _licenseKeyValidator.validateMetadata(
				"description", LicenseConstants.TYPE_ENTERPRISE, 0, "name",
				"owner", null));
	}

	@Test
	public void testValidateMetadataValid() {
		Assertions.assertDoesNotThrow(
			() -> _licenseKeyValidator.validateMetadata(
				"description", LicenseConstants.TYPE_ENTERPRISE, 0, "name",
				"owner", "7.4"));
	}

	@Test
	public void testValidateMetadataValidVirtualCluster() {
		Assertions.assertDoesNotThrow(
			() -> _licenseKeyValidator.validateMetadata(
				"description", LicenseConstants.TYPE_VIRTUAL_CLUSTER, 3, "name",
				"owner", "7.4"));
	}

	@Test
	public void testValidateServerInfoDuplicateIpAddresses() {
		Assertions.assertThrows(
			DuplicateIPAddressException.class,
			() -> _licenseKeyValidator.validateServerInfo(
				null, "127.0.0.1,127.0.0.1", null));
	}

	@Test
	public void testValidateServerInfoDuplicateMacAddresses() {
		Assertions.assertThrows(
			DuplicateMACAddressException.class,
			() -> _licenseKeyValidator.validateServerInfo(
				null, null, "00:11:22:33:44:55,00:11:22:33:44:55"));
	}

	@Test
	public void testValidateServerInfoInvalidIpAddress() {
		Assertions.assertThrows(
			LicenseKeyIPAddressException.class,
			() -> _licenseKeyValidator.validateServerInfo(
				null, "not-an-ip", null));
	}

	@Test
	public void testValidateServerInfoInvalidMacAddressCharacter() {
		Assertions.assertThrows(
			LicenseKeyMACAddressException.class,
			() -> _licenseKeyValidator.validateServerInfo(
				null, null, "00:11:22:33:44:5g"));
	}

	@Test
	public void testValidateServerInfoInvalidMacAddressOctetCount() {
		Assertions.assertThrows(
			LicenseKeyMACAddressException.class,
			() -> _licenseKeyValidator.validateServerInfo(
				null, null, "00:11:22"));
	}

	@Test
	public void testValidateServerInfoMissingAllDetails() {
		Assertions.assertThrows(
			LicenseKeyServerInfoException.class,
			() -> _licenseKeyValidator.validateServerInfo(null, null, null));
	}

	@Test
	public void testValidateServerInfoValidHostNameOnly() {
		Assertions.assertDoesNotThrow(
			() -> _licenseKeyValidator.validateServerInfo(
				"myhost.example.com", null, null));
	}

	@Test
	public void testValidateServerInfoValidIpAndMacAddresses() {
		Assertions.assertDoesNotThrow(
			() -> _licenseKeyValidator.validateServerInfo(
				null, "127.0.0.1,192.168.0.1",
				"00-11-22-33-44-55,AA:BB:CC:DD:EE:FF"));
	}

	@Test
	public void testValidateUpdateInvalidOwner() {
		Assertions.assertThrows(
			LicenseKeyOwnerException.class,
			() -> _licenseKeyValidator.validateUpdate(
				"description", null, null, LicenseConstants.TYPE_ENTERPRISE,
				null, null));
	}

	@Test
	public void testValidateUpdateRequiresServerInfoForProduction() {
		Assertions.assertThrows(
			LicenseKeyServerInfoException.class,
			() -> _licenseKeyValidator.validateUpdate(
				"description", null, null, LicenseConstants.TYPE_PRODUCTION,
				null, "owner"));
	}

	@Test
	public void testValidateUpdateValid() {
		Assertions.assertDoesNotThrow(
			() -> _licenseKeyValidator.validateUpdate(
				"description", null, null, LicenseConstants.TYPE_ENTERPRISE,
				null, "owner"));
	}

	private final LicenseKeyValidator _licenseKeyValidator =
		new LicenseKeyValidator();

}