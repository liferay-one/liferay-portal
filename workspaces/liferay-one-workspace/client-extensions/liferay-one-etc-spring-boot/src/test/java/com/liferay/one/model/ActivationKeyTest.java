/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.one.constants.LicenseKeyGenerationConstants;

import java.time.Instant;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-ACTIVATIONKEY] ActivationKey")
public class ActivationKeyTest {

	@Test
	public void testDatesAreNullWhenEmpty() {
		ActivationKey activationKey = new ActivationKey(
			new JSONObject(
			).put(
				"endDate", ""
			).put(
				"id", 1L
			));

		Assertions.assertNull(activationKey.getEndDateInstant());
		Assertions.assertNull(activationKey.getStartDateInstant());
	}

	@Test
	public void testDatesAreNullWhenUnparseable() {
		ActivationKey activationKey = new ActivationKey(
			new JSONObject(
			).put(
				"endDate", "tomorrow"
			).put(
				"startDate", "2026-13-45"
			));

		Assertions.assertNull(activationKey.getEndDateInstant());
		Assertions.assertNull(activationKey.getStartDateInstant());
	}

	@Test
	public void testFieldsReadFromJSON() {
		ActivationKey activationKey = new ActivationKey(
			new JSONObject(
			).put(
				"active", true
			).put(
				"endDate", "2027-01-01T00:00:00Z"
			).put(
				"externalReferenceCode", "ACTIVATION_KEY_ERC"
			).put(
				"id", 7L
			).put(
				"r_accountEntryToActivationKey_accountEntryId", 3L
			).put(
				"r_projectToActivationKey_c_projectERC", "PROJECT_ERC"
			).put(
				"startDate", "2026-01-01T00:00:00Z"
			).put(
				"type", "production"
			));

		Assertions.assertTrue(activationKey.isActive());
		Assertions.assertEquals(3L, activationKey.getAccountEntryId());
		Assertions.assertEquals(7L, activationKey.getActivationKeyId());
		Assertions.assertEquals(
			Instant.parse("2027-01-01T00:00:00Z"),
			activationKey.getEndDateInstant());
		Assertions.assertEquals(
			"ACTIVATION_KEY_ERC", activationKey.getExternalReferenceCode());
		Assertions.assertEquals(
			"PROJECT_ERC", activationKey.getProjectExternalReferenceCode());
		Assertions.assertEquals(
			Instant.parse("2026-01-01T00:00:00Z"),
			activationKey.getStartDateInstant());
		Assertions.assertEquals("production", activationKey.getType());
	}

	@Test
	public void testIsComplimentaryOnlyForComplimentaryKeyType() {
		Assertions.assertTrue(
			_createActivationKey(
				LicenseKeyGenerationConstants.KEY_TYPE_COMPLIMENTARY
			).isComplimentary());
		Assertions.assertFalse(
			_createActivationKey(
				"production"
			).isComplimentary());
		Assertions.assertFalse(
			_createActivationKey(
				""
			).isComplimentary());
	}

	private ActivationKey _createActivationKey(String type) {
		return new ActivationKey(
			new JSONObject(
			).put(
				"type", type
			));
	}

}