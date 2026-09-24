/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.model.Entitlement;

import java.util.Arrays;
import java.util.Collections;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class EntitlementUtilTest {

	@Test
	public void testGetUsageDefinitionExternalReferenceCode() {
		Assertions.assertEquals(
			"events-monthly",
			EntitlementUtil.getUsageDefinitionExternalReferenceCode(
				EntitlementConstants.NAME_EVENTS,
				Arrays.asList(
					_createEntitlement(
						EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET,
						"events-add-on"),
					_createEntitlement(EntitlementConstants.NAME_EVENTS, null),
					_createEntitlement(
						EntitlementConstants.NAME_EVENTS, "events-monthly"))));
	}

	@Test
	public void testGetUsageDefinitionExternalReferenceCodeReturnsNull() {
		Assertions.assertNull(
			EntitlementUtil.getUsageDefinitionExternalReferenceCode(
				EntitlementConstants.NAME_EVENTS,
				Collections.singletonList(
					_createEntitlement(
						EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET,
						"events-monthly"))));
	}

	private Entitlement _createEntitlement(
		String name, String usageDefinitionExternalReferenceCode) {

		JSONObject entitlementDefinitionJSONObject = new JSONObject(
		).put(
			"id", 1L
		);

		if (usageDefinitionExternalReferenceCode != null) {
			entitlementDefinitionJSONObject.put(
				"r_usageDefinitionToEntitlementDefinition_c_usageDefinitionERC",
				usageDefinitionExternalReferenceCode);
		}

		return new Entitlement(
			new JSONObject(
			).put(
				"entitlementDefinitionToEntitlement",
				entitlementDefinitionJSONObject
			).put(
				"id", 1L
			).put(
				"name", name
			));
	}

}