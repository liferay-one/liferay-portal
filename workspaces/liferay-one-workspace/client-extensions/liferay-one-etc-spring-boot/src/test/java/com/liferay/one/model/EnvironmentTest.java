/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import java.time.Instant;

import java.util.Collections;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-ENVIRONMENT] Environment")
public class EnvironmentTest {

	@Test
	public void testBundledEntitlementIdsAreEmptyWhenBlank() {
		Assertions.assertEquals(
			Collections.emptyList(),
			_createEnvironment(
				"bundledEntitlementIds", ""
			).getBundledEntitlementIds());
		Assertions.assertEquals(
			Collections.emptyList(),
			_createEnvironment(
				"name", "Name"
			).getBundledEntitlementIds());
	}

	@Test
	public void testBundledEntitlementIdsAreEmptyWhenUnreadable() {
		Assertions.assertEquals(
			Collections.emptyList(),
			_createEnvironment(
				"bundledEntitlementIds", "1,2"
			).getBundledEntitlementIds());
		Assertions.assertEquals(
			Collections.emptyList(),
			_createEnvironment(
				"bundledEntitlementIds", "[\"a\"]"
			).getBundledEntitlementIds());
	}

	@Test
	public void testBundledEntitlementIdsParseJSONArray() {
		Assertions.assertEquals(
			List.of(1L, 2L, 3L),
			_createEnvironment(
				"bundledEntitlementIds", "[1, 2, \"3\"]"
			).getBundledEntitlementIds());
	}

	@Test
	public void testFieldsReadFromJSON() {
		Environment environment = new Environment(
			new JSONObject(
			).put(
				"activationCode", "CODE"
			).put(
				"activationMode", "online"
			).put(
				"activationStatus", "active"
			).put(
				"currentEntitlementHash", "HASH"
			).put(
				"externalReferenceCode", "ENV_ERC"
			).put(
				"id", 8L
			).put(
				"lastHeartbeatAt", "2026-05-01T10:00:00Z"
			).put(
				"name", "Production"
			).put(
				"offering", "saas"
			).put(
				"publicKey", "KEY"
			).put(
				"r_accountEntryToEnvironment_accountEntryId", 2L
			).put(
				"r_contractToEnvironment_c_contractId", 3L
			).put(
				"r_projectToEnvironment_c_projectERC", "PROJECT_ERC"
			).put(
				"region", "us"
			).put(
				"requestedVersion", "2026.Q1"
			).put(
				"type", "production"
			));

		Assertions.assertEquals(2L, environment.getAccountEntryId());
		Assertions.assertEquals("CODE", environment.getActivationCode());
		Assertions.assertEquals("online", environment.getActivationMode());
		Assertions.assertEquals("active", environment.getActivationStatus());
		Assertions.assertEquals(3L, environment.getContractId());
		Assertions.assertEquals(
			"HASH", environment.getCurrentEntitlementHash());
		Assertions.assertEquals(
			"ENV_ERC", environment.getExternalReferenceCode());
		Assertions.assertEquals(8L, environment.getId());
		Assertions.assertEquals(
			Instant.parse("2026-05-01T10:00:00Z"),
			environment.getLastHeartbeatAtInstant());
		Assertions.assertEquals("Production", environment.getName());
		Assertions.assertEquals("saas", environment.getOffering());
		Assertions.assertEquals(
			"PROJECT_ERC", environment.getProjectExternalReferenceCode());
		Assertions.assertEquals("KEY", environment.getPublicKey());
		Assertions.assertEquals("us", environment.getRegion());
		Assertions.assertEquals("2026.Q1", environment.getRequestedVersion());
		Assertions.assertEquals("production", environment.getType());
	}

	@Test
	public void testLastHeartbeatAtInstantIsNullWhenBlank() {
		Assertions.assertNull(
			_createEnvironment(
				"lastHeartbeatAt", ""
			).getLastHeartbeatAtInstant());
	}

	private Environment _createEnvironment(String key, String value) {
		return new Environment(
			new JSONObject(
			).put(
				key, value
			).put(
				"id", 1L
			));
	}

}