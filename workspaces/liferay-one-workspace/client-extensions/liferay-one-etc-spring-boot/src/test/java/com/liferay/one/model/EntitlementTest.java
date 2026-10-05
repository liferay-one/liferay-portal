/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.one.constants.EntitlementConstants;

import java.time.Duration;
import java.time.Instant;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-ENTITLEMENT] Entitlement")
public class EntitlementTest {

	@Test
	public void testBlankEndDateIsNotExpired() {
		Entitlement entitlement = new Entitlement(
			_createJSONObject().put("endDate", ""));

		Assertions.assertNull(entitlement.getEndDateInstant());
		Assertions.assertFalse(entitlement.isExpired());
	}

	@Test
	public void testBlankTerminationStatusDefaultsToActive() {
		Entitlement entitlement = new Entitlement(
			_createJSONObject().put("terminationStatus", ""));

		Assertions.assertEquals(
			EntitlementConstants.TERMINATION_STATUS_ACTIVE,
			entitlement.getTerminationStatus());
	}

	@Test
	public void testFutureEndDateIsNotExpired() {
		Instant endDateInstant = Instant.now(
		).plus(
			Duration.ofDays(1)
		);

		Entitlement entitlement = new Entitlement(
			_createJSONObject().put("endDate", endDateInstant.toString()));

		Assertions.assertEquals(
			endDateInstant, entitlement.getEndDateInstant());
		Assertions.assertFalse(entitlement.isExpired());
	}

	@Test
	public void testMissingDefinitionIsNull() {
		Entitlement entitlement = new Entitlement(_createJSONObject());

		Assertions.assertNull(entitlement.getEntitlementDefinition());
		Assertions.assertNull(entitlement.getQuantity());
		Assertions.assertNull(entitlement.getStartDateInstant());
	}

	@Test
	public void testNestedDefinitionIsParsed() {
		Entitlement entitlement = new Entitlement(
			_createJSONObject(
			).put(
				"entitlementDefinitionToEntitlement",
				new JSONObject(
				).put(
					"id", 7
				).put(
					"unit", "GiB"
				)
			).put(
				"quantity", 3
			));

		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		Assertions.assertNotNull(entitlementDefinition);
		Assertions.assertEquals("GiB", entitlementDefinition.getUnit());

		Assertions.assertEquals(3.0, entitlement.getQuantity());
	}

	@Test
	public void testPastEndDateIsExpired() {
		Entitlement entitlement = new Entitlement(
			_createJSONObject().put("endDate", "2020-01-01T00:00:00Z"));

		Assertions.assertTrue(entitlement.isExpired());
	}

	@Test
	public void testTerminationStatusIsKept() {
		Entitlement entitlement = new Entitlement(
			_createJSONObject().put(
				"terminationStatus",
				EntitlementConstants.TERMINATION_STATUS_TERMINATED));

		Assertions.assertEquals(
			EntitlementConstants.TERMINATION_STATUS_TERMINATED,
			entitlement.getTerminationStatus());
	}

	private JSONObject _createJSONObject() {
		return new JSONObject(
		).put(
			"id", 1
		);
	}

}