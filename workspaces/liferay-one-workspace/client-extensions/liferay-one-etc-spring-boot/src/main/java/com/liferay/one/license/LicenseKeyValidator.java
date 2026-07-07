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
import com.liferay.one.exception.LicenseKeyValidationException;
import com.liferay.petra.string.CharPool;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.Date;
import java.util.HashSet;
import java.util.Set;

import org.springframework.stereotype.Component;

/**
 * @author Allen Ziegenfus
 */
@Component
public class LicenseKeyValidator {

	public void validateDates(
			Date expirationDate, String hostName, String ipAddresses,
			String licenseEntryType, String macAddresses, Date startDate)
		throws LicenseKeyValidationException {

		if ((startDate == null) || (expirationDate == null) ||
			expirationDate.before(startDate)) {

			throw new LicenseKeyDateException(
				"Invalid start date or expiration date");
		}

		if (_requiresServerInfo(licenseEntryType)) {
			validateServerInfo(hostName, ipAddresses, macAddresses);
		}
	}

	public void validateMetadata(
			String description, String licenseEntryType, int maxClusterNodes,
			String name, String owner, String productVersion)
		throws LicenseKeyValidationException {

		if (Validator.isNull(productVersion)) {
			throw new LicenseKeyProductVersionException(
				"Invalid product version");
		}

		if (Validator.isNull(name) || (name.length() > 75)) {
			throw new LicenseKeyNameException("Invalid license name");
		}

		if (Validator.isNull(owner) || (owner.length() > 75)) {
			throw new LicenseKeyOwnerException("Invalid owner");
		}

		if (Validator.isNull(description) || (description.length() > 255)) {
			throw new LicenseKeyDescriptionException("Invalid description");
		}

		if (licenseEntryType.equals(LicenseConstants.TYPE_VIRTUAL_CLUSTER) &&
			(maxClusterNodes <= 0)) {

			throw new LicenseKeyMaxClusterNodesException(
				"Invalid max cluster nodes");
		}
	}

	public void validateServerInfo(
			String hostName, String ipAddresses, String macAddresses)
		throws LicenseKeyValidationException {

		Set<String> distinctIpAddresses = new HashSet<>();

		for (String ipAddress : StringUtil.split(ipAddresses)) {
			_validateIpAddress(ipAddress);

			if (distinctIpAddresses.contains(ipAddress)) {
				throw new DuplicateIPAddressException("Duplicate IP addresses");
			}

			distinctIpAddresses.add(ipAddress);
		}

		Set<String> distinctMacAddresses = new HashSet<>();

		for (String macAddress : StringUtil.split(macAddresses)) {
			_validateMacAddress(macAddress);

			if (distinctMacAddresses.contains(macAddress)) {
				throw new DuplicateMACAddressException(
					"Duplicate MAC addresses");
			}

			distinctMacAddresses.add(macAddress);
		}

		if (Validator.isNull(hostName) && distinctIpAddresses.isEmpty() &&
			distinctMacAddresses.isEmpty()) {

			throw new LicenseKeyServerInfoException("Invalid server details");
		}
	}

	public void validateUpdate(
			String description, String hostName, String ipAddresses,
			String licenseEntryType, String macAddresses, String owner)
		throws LicenseKeyValidationException {

		if (Validator.isNull(owner) || (owner.length() > 75)) {
			throw new LicenseKeyOwnerException("Invalid owner");
		}

		if (Validator.isNull(description) || (description.length() > 255)) {
			throw new LicenseKeyDescriptionException("Invalid description");
		}

		if (_requiresServerInfo(licenseEntryType)) {
			validateServerInfo(hostName, ipAddresses, macAddresses);
		}
	}

	private boolean _requiresServerInfo(String licenseEntryType) {
		if (_TYPE_BACKUP.equals(licenseEntryType) ||
			LicenseConstants.TYPE_LIMITED.equals(licenseEntryType) ||
			LicenseConstants.TYPE_PER_USER.equals(licenseEntryType) ||
			LicenseConstants.TYPE_PRODUCTION.equals(licenseEntryType)) {

			return true;
		}

		return false;
	}

	private void _validateIpAddress(String ipAddress)
		throws LicenseKeyValidationException {

		if (!Validator.isIPAddress(ipAddress)) {
			throw new LicenseKeyIPAddressException("Invalid IP addresses");
		}
	}

	private void _validateMacAddress(String macAddress)
		throws LicenseKeyValidationException {

		String curMacAddress = StringUtil.replace(
			macAddress, CharPool.DASH, CharPool.COLON);

		String[] octets = StringUtil.split(curMacAddress, StringPool.COLON);

		if (octets.length != 6) {
			throw new LicenseKeyMACAddressException("Invalid MAC addresses");
		}

		for (String octet : octets) {
			if (octet.length() > 2) {
				throw new LicenseKeyMACAddressException(
					"Invalid MAC addresses");
			}

			for (char c : octet.toCharArray()) {
				if (!Validator.isDigit(c) &&
					((c < 65) || ((c > 70) && (c < 97)) || (c > 102))) {

					throw new LicenseKeyMACAddressException(
						"Invalid MAC addresses");
				}
			}
		}
	}

	private static final String _TYPE_BACKUP = "backup";

}