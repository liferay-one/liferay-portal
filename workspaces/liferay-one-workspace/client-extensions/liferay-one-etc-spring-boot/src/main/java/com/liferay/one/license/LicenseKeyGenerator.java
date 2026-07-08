/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.one.constants.ProductVersion;
import com.liferay.portal.ee.license.shared.KeyGenerator;
import com.liferay.portal.kernel.util.StringUtil;

import java.util.Calendar;
import java.util.Date;
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
			String serverIds, Date startDate, Date expirationDate,
			Date createDate)
		throws Exception {

		return encrypt(
			getProperties(
				accountName, licenseEntryName, licenseType, licenseVersion,
				productName, productId, productVersion, owner, maxClusterNodes,
				maxServers, maxHttpSessions, maxConcurrentUsers, maxUsers,
				sizing, description, domains, hostNames, ipAddresses,
				macAddresses, serverIds, startDate, expirationDate,
				createDate));
	}

	public Map<String, String> getProperties(
		String accountName, String licenseEntryName, String licenseType,
		int licenseVersion, String productName, String productId,
		String productVersion, String owner, int maxClusterNodes,
		int maxServers, int maxHttpSessions, long maxConcurrentUsers,
		long maxUsers, String sizing, String description, String domains,
		String hostNames, String ipAddresses, String macAddresses,
		String serverIds, Date startDate, Date expirationDate,
		Date createDate) {

		Map<String, String> properties = KeyGenerator.getProperties(
			accountName, description, StringUtil.split(domains), expirationDate,
			StringUtil.split(hostNames), sizing, StringUtil.split(ipAddresses),
			licenseEntryName, licenseType, String.valueOf(licenseVersion),
			StringUtil.split(macAddresses), maxClusterNodes, maxConcurrentUsers,
			maxHttpSessions, maxServers, maxUsers, owner, productName,
			productId, productVersion, new String[] {serverIds}, startDate);

		if (StringUtil.equals(
				productVersion, ProductVersion.PORTAL_VERSION_6_1_10) ||
			StringUtil.equals(productVersion, "6.1 GA 1")) {

			Calendar cal = Calendar.getInstance();

			cal.set(Calendar.DAY_OF_MONTH, 31);
			cal.set(Calendar.MONTH, 6);
			cal.set(Calendar.YEAR, 2012);

			if (createDate.before(cal.getTime())) {
				properties.put("productVersion", "6.1");
			}
		}

		return properties;
	}

}