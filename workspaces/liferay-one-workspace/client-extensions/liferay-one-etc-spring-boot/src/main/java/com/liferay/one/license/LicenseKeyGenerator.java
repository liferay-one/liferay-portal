/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.petra.string.CharPool;
import com.liferay.portal.ee.license.shared.KeyGenerator;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.util.StringUtil;

import java.util.Date;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Component;

/**
 * @author Allen Ziegenfus
 */
@Component
public class LicenseKeyGenerator {

	public String encrypt(Map<String, String> properties) throws Exception {
		return KeyGenerator.encrypt(properties);
	}

	public String generateKey(
			String accountName, String licenseEntryName, String licenseType,
			int licenseVersion, String productName, String productId,
			String productVersion, String owner, int maxClusterNodes,
			int maxServers, int maxHttpSessions, long maxConcurrentUsers,
			long maxUsers, String sizing, String description, String domains,
			String hostNames, String ipAddresses, String macAddresses,
			String serverIds, Date startDate, Date expirationDate)
		throws Exception {

		return encrypt(
			getProperties(
				accountName, licenseEntryName, licenseType, licenseVersion,
				productName, productId, productVersion, owner, maxClusterNodes,
				maxServers, maxHttpSessions, maxConcurrentUsers, maxUsers,
				sizing, description, domains, hostNames, ipAddresses,
				macAddresses, serverIds, startDate, expirationDate));
	}

	public Map<String, String> getProperties(
		String accountName, String licenseEntryName, String licenseType,
		int licenseVersion, String productName, String productId,
		String productVersion, String owner, int maxClusterNodes,
		int maxServers, int maxHttpSessions, long maxConcurrentUsers,
		long maxUsers, String sizing, String description, String domains,
		String hostNames, String ipAddresses, String macAddresses,
		String serverIds, Date startDate, Date expirationDate) {

		Map<String, String> properties = KeyGenerator.getProperties(
			accountName, description, StringUtil.split(domains), expirationDate,
			StringUtil.split(hostNames), sizing, StringUtil.split(ipAddresses),
			licenseEntryName, licenseType, String.valueOf(licenseVersion),
			StringUtil.split(macAddresses), maxClusterNodes, maxConcurrentUsers,
			maxHttpSessions, maxServers, maxUsers, owner, productName,
			productId, productVersion, new String[] {serverIds}, startDate);

		if (licenseVersion < 6) {
			properties.remove("instanceSize");
		}

		if (licenseVersion == 2) {
			properties.remove("hostNames");
			properties.remove("ipAddresses");
			properties.remove("macAddresses");
			properties.remove("productId");
			properties.remove("serverIds");

			properties.put("accountEntryName", accountName);
			properties.put("licenseEntryName", licenseEntryName);

			if (licenseType.equals(LicenseConstants.TYPE_CLUSTER) ||
				licenseType.equals(LicenseConstants.TYPE_DEVELOPER_CLUSTER)) {

				properties.put("maxServers", String.valueOf(maxServers));
			}

			if (licenseType.equals(LicenseConstants.TYPE_PRODUCTION)) {
				properties.put(
					"serverIds",
					StringUtil.replace(
						StringUtil.toLowerCase(serverIds, Locale.ROOT),
						CharPool.DASH, CharPool.COLON));
			}

			return properties;
		}

		if (licenseType.equals(LicenseConstants.TYPE_CLUSTER)) {
			properties.put(
				"hostNames", StringUtil.merge(StringUtil.split(hostNames)));
			properties.put(
				"ipAddresses", StringUtil.merge(StringUtil.split(ipAddresses)));
			properties.put(
				"macAddresses",
				StringUtil.replace(
					StringUtil.merge(StringUtil.split(macAddresses)),
					CharPool.DASH, CharPool.COLON));
			properties.put("maxServers", String.valueOf(maxServers));
			properties.put("serverIds", serverIds);
		}

		return properties;
	}

}