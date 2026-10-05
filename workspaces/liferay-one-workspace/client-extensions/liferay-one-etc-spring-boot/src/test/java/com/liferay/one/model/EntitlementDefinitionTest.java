/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import java.util.Collections;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-ENTITLEMENTDEFINITION] EntitlementDefinition")
public class EntitlementDefinitionTest {

	@Test
	public void testOptionalNumbersAreNullWhenAbsent() {
		EntitlementDefinition entitlementDefinition = new EntitlementDefinition(
			new JSONObject(
			).put(
				"id", 1L
			));

		Assertions.assertNull(entitlementDefinition.getDefaultQuantity());
		Assertions.assertNull(entitlementDefinition.getMaxQuantity());
		Assertions.assertEquals(
			0, entitlementDefinition.getLicenseKeyDurationDays());
	}

	@Test
	public void testOptionalNumbersReadWhenPresent() {
		EntitlementDefinition entitlementDefinition = new EntitlementDefinition(
			new JSONObject(
			).put(
				"defaultQuantity", 2.5
			).put(
				"id", 1L
			).put(
				"licenseKeyDurationDays", 30
			).put(
				"maxQuantity", 10
			));

		Assertions.assertEquals(
			2.5, entitlementDefinition.getDefaultQuantity());
		Assertions.assertEquals(
			30, entitlementDefinition.getLicenseKeyDurationDays());
		Assertions.assertEquals(10.0, entitlementDefinition.getMaxQuantity());
	}

	@Test
	public void testProductOptionsAreEmptyWhenBlank() {
		Assertions.assertEquals(
			Collections.emptyMap(),
			_createEntitlementDefinition(
				""
			).getProductOptions());
		Assertions.assertEquals(
			Collections.emptyMap(),
			new EntitlementDefinition(
				new JSONObject(
				).put(
					"id", 1L
				)
			).getProductOptions());
	}

	@Test
	public void testProductOptionsAreEmptyWhenMalformed() {
		Assertions.assertEquals(
			Collections.emptyMap(),
			_createEntitlementDefinition(
				"{not json"
			).getProductOptions());
	}

	@Test
	public void testProductOptionsParseIntoLowercaseKeyMap() {
		EntitlementDefinition entitlementDefinition =
			_createEntitlementDefinition(
				"{\"Environment-Type\": \"Production\", \"SIZE\": 4}");

		Assertions.assertEquals(
			Map.of("environment-type", "Production", "size", "4"),
			entitlementDefinition.getProductOptions());
	}

	@Test
	public void testStringFieldsReadFromJSON() {
		EntitlementDefinition entitlementDefinition = new EntitlementDefinition(
			new JSONObject(
			).put(
				"active", true
			).put(
				"displayName", "Display"
			).put(
				"externalReferenceCode", "ED_ERC"
			).put(
				"generatesActivationKey", true
			).put(
				"grantType", "unlimited"
			).put(
				"id", 4L
			).put(
				"licenseKeyFamily", "dxp"
			).put(
				"licenseKeyType", "production"
			).put(
				"name", "Name"
			).put(
				"r_usageDefinitionToEntitlementDefinition_c_usageDefinitionERC",
				"UD_ERC"
			).put(
				"skuExternalReferenceCode", "SKU_ERC"
			).put(
				"unit", "vCPU"
			));

		Assertions.assertTrue(entitlementDefinition.isActive());
		Assertions.assertEquals(
			"Display", entitlementDefinition.getDisplayName());
		Assertions.assertEquals(
			4L, entitlementDefinition.getEntitlementDefinitionId());
		Assertions.assertEquals(
			"ED_ERC", entitlementDefinition.getExternalReferenceCode());
		Assertions.assertTrue(entitlementDefinition.isGeneratesActivationKey());
		Assertions.assertEquals(
			"unlimited", entitlementDefinition.getGrantType());
		Assertions.assertEquals(
			"dxp", entitlementDefinition.getLicenseKeyFamily());
		Assertions.assertEquals(
			"production", entitlementDefinition.getLicenseKeyType());
		Assertions.assertEquals("Name", entitlementDefinition.getName());
		Assertions.assertEquals(
			"SKU_ERC", entitlementDefinition.getSkuExternalReferenceCode());
		Assertions.assertEquals("vCPU", entitlementDefinition.getUnit());
		Assertions.assertEquals(
			"UD_ERC",
			entitlementDefinition.getUsageDefinitionExternalReferenceCode());
	}

	private EntitlementDefinition _createEntitlementDefinition(
		String productOptions) {

		return new EntitlementDefinition(
			new JSONObject(
			).put(
				"id", 1L
			).put(
				"productOptions", productOptions
			));
	}

}