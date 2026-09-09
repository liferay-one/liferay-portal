/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
public class TrialConstantsTest {

	@Test
	public void testGetDurationDaysSelfService() {
		Assertions.assertEquals(
			90,
			TrialConstants.getDurationDays(
				TrialConstants.ORDER_TYPE_EXTERNAL_REFERENCE_CODE_CMP_TRIAL));
		Assertions.assertEquals(
			90,
			TrialConstants.getDurationDays(
				TrialConstants.ORDER_TYPE_EXTERNAL_REFERENCE_CODE_DSR_TRIAL));
	}

	@Test
	public void testGetDurationDaysWithoutSelfService() {
		Assertions.assertEquals(7, TrialConstants.getDurationDays("SOLUTIONS7"));
		Assertions.assertEquals(7, TrialConstants.getDurationDays("SSA_SAAS"));
		Assertions.assertEquals(7, TrialConstants.getDurationDays(null));
	}

	@Test
	public void testIsSelfService() {
		Assertions.assertTrue(
			TrialConstants.isSelfService(
				TrialConstants.ORDER_TYPE_EXTERNAL_REFERENCE_CODE_CMP_TRIAL));
		Assertions.assertTrue(
			TrialConstants.isSelfService(
				TrialConstants.ORDER_TYPE_EXTERNAL_REFERENCE_CODE_DSR_TRIAL));
		Assertions.assertFalse(TrialConstants.isSelfService("CMP_BETA"));
		Assertions.assertFalse(TrialConstants.isSelfService("DSR"));
		Assertions.assertFalse(TrialConstants.isSelfService(null));
	}

}
