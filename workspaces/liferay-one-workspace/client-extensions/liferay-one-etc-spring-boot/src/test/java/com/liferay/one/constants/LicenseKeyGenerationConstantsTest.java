/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

import com.liferay.portal.ee.license.shared.LicenseConstants;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Amos Fong
 */
@DisplayName("[SVC-LICENSEKEYGENERATIONSERVICE] LicenseKeyGenerationConstants")
public class LicenseKeyGenerationConstantsTest {

	@Test
	public void testGetActivationCount() {
		Assertions.assertEquals(
			1,
			LicenseKeyGenerationConstants.getActivationCount(
				LicenseConstants.TYPE_PRODUCTION, 0));
		Assertions.assertEquals(
			1,
			LicenseKeyGenerationConstants.getActivationCount(
				LicenseConstants.TYPE_VIRTUAL_CLUSTER, 0));
		Assertions.assertEquals(
			3,
			LicenseKeyGenerationConstants.getActivationCount(
				LicenseConstants.TYPE_VIRTUAL_CLUSTER, 3));
	}

	@Test
	public void testGetMaxClusterNodes() {
		Assertions.assertEquals(
			4,
			LicenseKeyGenerationConstants.getMaxClusterNodes(
				LicenseConstants.TYPE_FREE, 4));
		Assertions.assertEquals(
			0,
			LicenseKeyGenerationConstants.getMaxClusterNodes(
				LicenseConstants.TYPE_PRODUCTION, 3));
		Assertions.assertEquals(
			3,
			LicenseKeyGenerationConstants.getMaxClusterNodes(
				LicenseConstants.TYPE_VIRTUAL_CLUSTER, 3));
	}

	@Test
	public void testGetMaxServers() {
		Assertions.assertEquals(
			3,
			LicenseKeyGenerationConstants.getMaxServers(
				LicenseConstants.TYPE_CLUSTER, 3));
		Assertions.assertEquals(
			1,
			LicenseKeyGenerationConstants.getMaxServers(
				LicenseConstants.TYPE_DEVELOPER, 0));
		Assertions.assertEquals(
			1,
			LicenseKeyGenerationConstants.getMaxServers(
				LicenseConstants.TYPE_PRODUCTION, 0));
	}

}