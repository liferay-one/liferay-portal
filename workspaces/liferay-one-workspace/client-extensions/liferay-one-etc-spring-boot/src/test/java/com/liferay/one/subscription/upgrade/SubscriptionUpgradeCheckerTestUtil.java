/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.subscription.upgrade;

import com.liferay.one.model.Entitlement;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.json.JSONObject;

/**
 * @author Felipe Veloso
 */
public class SubscriptionUpgradeCheckerTestUtil {

	public static Entitlement createEntitlement(
		long contractId, long entitlementId, String skuExternalReferenceCode) {

		return createEntitlement(
			contractId, entitlementId, skuExternalReferenceCode,
			Instant.now(
			).minus(
				30, ChronoUnit.DAYS
			),
			"active");
	}

	public static Entitlement createEntitlement(
		long contractId, long entitlementId, String skuExternalReferenceCode,
		Instant startDateInstant, String terminationStatus) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"endDate",
			String.valueOf(
				Instant.now(
				).plus(
					365, ChronoUnit.DAYS
				))
		).put(
			"id", entitlementId
		).put(
			"r_commerceOrderItemToEntitlement_commerceOrderItemId",
			entitlementId * 10
		).put(
			"r_contractToEntitlement_c_contractId", contractId
		).put(
			"r_projectToEntitlement_c_projectERC", "PROJECT"
		).put(
			"skuExternalReferenceCode", skuExternalReferenceCode
		).put(
			"terminationStatus", terminationStatus
		);

		if (startDateInstant != null) {
			jsonObject.put("startDate", startDateInstant.toString());
		}

		return new Entitlement(jsonObject);
	}

	public static Instant getFutureInstant() {
		return Instant.now(
		).plus(
			30, ChronoUnit.DAYS
		);
	}

}