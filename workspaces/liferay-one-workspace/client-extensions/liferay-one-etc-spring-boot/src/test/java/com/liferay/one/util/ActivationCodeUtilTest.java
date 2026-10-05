/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-ACTIVATIONCODEUTIL] ActivationCodeUtil")
public class ActivationCodeUtilTest {

	@Test
	public void testGenerateIsUniqueAcrossCalls() {
		Set<String> activationCodes = new HashSet<>();

		for (int i = 0; i < 100; i++) {
			activationCodes.add(ActivationCodeUtil.generate());
		}

		Assertions.assertEquals(100, activationCodes.size());
	}

	@Test
	public void testGenerateReturnsUUIDWithoutDashes() {
		String activationCode = ActivationCodeUtil.generate();

		Assertions.assertEquals(32, activationCode.length());
		Assertions.assertFalse(activationCode.contains("-"));
		Assertions.assertTrue(activationCode.matches("[0-9a-f]{32}"));
	}

}