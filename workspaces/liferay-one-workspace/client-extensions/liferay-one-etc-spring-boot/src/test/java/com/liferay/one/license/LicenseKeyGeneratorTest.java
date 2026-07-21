/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.portal.ee.license.shared.LicenseConstants;

import java.util.Date;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Allen Ziegenfus
 */
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

	private String _generateKey() throws Exception {
		return _licenseKeyGenerator.generateKey(
			"Acme Corp", "Enterprise", LicenseConstants.TYPE_ENTERPRISE, 3,
			"Liferay DXP", LicenseConstants.PRODUCT_ID_PORTAL, "7.4",
			"Acme Corp", 0, 0, 0, 0L, 0L, "", "Test license", "",
			"host.example.com", "127.0.0.1", "00:11:22:33:44:55", "srv-1",
			new Date(1000000000000L), new Date(2000000000000L));
	}

	private final LicenseKeyGenerator _licenseKeyGenerator =
		new LicenseKeyGenerator();

}