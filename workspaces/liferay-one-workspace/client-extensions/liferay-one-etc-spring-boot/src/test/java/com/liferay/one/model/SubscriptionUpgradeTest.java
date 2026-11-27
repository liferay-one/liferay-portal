/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import java.time.Instant;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Felipe Veloso
 */
@DisplayName("[CLS-SUBSCRIPTIONUPGRADE] SubscriptionUpgrade")
public class SubscriptionUpgradeTest {

	@Test
	public void testSubscriptionUpgradeWithoutContractEndDate() {
		Assertions.assertThrows(
			NullPointerException.class,
			() -> new SubscriptionUpgrade(
				null, "SKU_ACTIVATE", "ai-hub-studio", "AI Hub Studio",
				"SKU_STUDIO", "ai-hub"));
	}

	@Test
	public void testToJSONObject() {
		SubscriptionUpgrade subscriptionUpgrade = new SubscriptionUpgrade(
			Instant.parse("2027-10-31T00:00:00Z"), "SKU_ACTIVATE",
			"ai-hub-studio", "AI Hub Studio", "SKU_STUDIO", "ai-hub");

		JSONObject jsonObject = subscriptionUpgrade.toJSONObject();

		Assertions.assertEquals(
			"2027-10-31T00:00:00Z", jsonObject.getString("contractEndDate"));
		Assertions.assertEquals(
			"SKU_ACTIVATE",
			jsonObject.getString("currentSkuExternalReferenceCode"));
		Assertions.assertEquals("ai-hub-studio", jsonObject.getString("key"));
		Assertions.assertEquals(
			"AI Hub Studio", jsonObject.getString("targetProduct"));
		Assertions.assertEquals(
			"SKU_STUDIO",
			jsonObject.getString("targetSkuExternalReferenceCode"));
		Assertions.assertEquals("ai-hub", jsonObject.getString("type"));
	}

}