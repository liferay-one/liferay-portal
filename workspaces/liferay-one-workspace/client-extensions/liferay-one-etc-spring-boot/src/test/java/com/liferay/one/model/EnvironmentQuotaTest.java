/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.one.constants.EnvironmentConstants;

import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-ENVIRONMENTQUOTA] EnvironmentQuota")
public class EnvironmentQuotaTest {

	@Test
	public void testGetAvailableCountNeverDropsBelowZero() {
		EnvironmentQuota environmentQuota = _createEnvironmentQuota(
			Collections.emptyList(), 2, false, 5);

		Assertions.assertEquals(0, environmentQuota.getAvailableCount());
		Assertions.assertFalse(environmentQuota.isAvailable());
	}

	@Test
	public void testIsAvailableWithRemainingCount() {
		EnvironmentQuota environmentQuota = _createEnvironmentQuota(
			Collections.emptyList(), 3, false, 1);

		Assertions.assertEquals(2, environmentQuota.getAvailableCount());
		Assertions.assertTrue(environmentQuota.isAvailable());
	}

	@Test
	public void testIsAvailableWithUnlimitedQuota() {
		EnvironmentQuota environmentQuota = _createEnvironmentQuota(
			Collections.emptyList(), 0, true, 10);

		Assertions.assertEquals(0, environmentQuota.getAvailableCount());
		Assertions.assertTrue(environmentQuota.isAvailable());
	}

	private EnvironmentQuota _createEnvironmentQuota(
		List<Environment> environments, int totalCount, boolean unlimited,
		int usedCount) {

		return new EnvironmentQuota(
			1, environments, 1, totalCount,
			EnvironmentConstants.TYPE_PRODUCTION, unlimited, usedCount);
	}

}