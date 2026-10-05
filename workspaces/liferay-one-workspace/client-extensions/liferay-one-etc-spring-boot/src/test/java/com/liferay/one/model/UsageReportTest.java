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
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-USAGEREPORT] UsageReport")
public class UsageReportTest {

	@Test
	public void testDatesAreNullWhenBlank() {
		UsageReport usageReport = new UsageReport(
			new JSONObject(
			).put(
				"dateFrom", ""
			).put(
				"id", 1L
			));

		Assertions.assertNull(usageReport.getDateFromInstant());
		Assertions.assertNull(usageReport.getDateToInstant());
		Assertions.assertNull(usageReport.getGeneratedAtInstant());
	}

	@Test
	public void testFieldsReadFromJSON() {
		UsageReport usageReport = new UsageReport(
			new JSONObject(
			).put(
				"accountExternalReferenceCode", "ACCOUNT_ERC"
			).put(
				"aggregateQuantity", 12.5
			).put(
				"commerceOrderId", 3L
			).put(
				"contractExternalReferenceCode", "CONTRACT_ERC"
			).put(
				"dateFrom", "2026-01-01T00:00:00Z"
			).put(
				"dateTo", "2026-01-31T23:59:59Z"
			).put(
				"entitledQuantity", 10
			).put(
				"externalReferenceCode", "REPORT_ERC"
			).put(
				"generatedAt", "2026-02-01T00:00:00Z"
			).put(
				"generatorClassName", "Generator"
			).put(
				"id", 4L
			).put(
				"overageAmount", 25
			).put(
				"overageCurrency", "USD"
			).put(
				"overageQuantity", 2.5
			).put(
				"overageSkuQuantity", 1
			).put(
				"r_projectToUsageReport_c_projectId", 5L
			).put(
				"r_usageDefinitionToUsageReport_c_usageDefinitionId", 6L
			).put(
				"skuExternalReferenceCode", "SKU_ERC"
			).put(
				"targetClassName", "Target"
			).put(
				"targetPK", 7L
			).put(
				"targetType", "project"
			));

		Assertions.assertEquals(
			"ACCOUNT_ERC", usageReport.getAccountExternalReferenceCode());
		Assertions.assertEquals(12.5, usageReport.getAggregateQuantity());
		Assertions.assertEquals(3L, usageReport.getCommerceOrderId());
		Assertions.assertEquals(
			"CONTRACT_ERC", usageReport.getContractExternalReferenceCode());
		Assertions.assertEquals(
			Instant.parse("2026-01-01T00:00:00Z"),
			usageReport.getDateFromInstant());
		Assertions.assertEquals(
			Instant.parse("2026-01-31T23:59:59Z"),
			usageReport.getDateToInstant());
		Assertions.assertEquals(10.0, usageReport.getEntitledQuantity());
		Assertions.assertEquals(
			"REPORT_ERC", usageReport.getExternalReferenceCode());
		Assertions.assertEquals(
			Instant.parse("2026-02-01T00:00:00Z"),
			usageReport.getGeneratedAtInstant());
		Assertions.assertEquals(
			"Generator", usageReport.getGeneratorClassName());
		Assertions.assertEquals(25.0, usageReport.getOverageAmount());
		Assertions.assertEquals("USD", usageReport.getOverageCurrency());
		Assertions.assertEquals(2.5, usageReport.getOverageQuantity());
		Assertions.assertEquals(1.0, usageReport.getOverageSkuQuantity());
		Assertions.assertEquals(5L, usageReport.getProjectId());
		Assertions.assertEquals(
			"SKU_ERC", usageReport.getSkuExternalReferenceCode());
		Assertions.assertEquals("Target", usageReport.getTargetClassName());
		Assertions.assertEquals(7L, usageReport.getTargetPK());
		Assertions.assertEquals("project", usageReport.getTargetType());
		Assertions.assertEquals(6L, usageReport.getUsageDefinitionId());
		Assertions.assertEquals(4L, usageReport.getUsageReportId());
	}

	@Test
	public void testOptionalQuantitiesAreNullWhenAbsent() {
		UsageReport usageReport = new UsageReport(
			new JSONObject(
			).put(
				"id", 1L
			));

		Assertions.assertNull(usageReport.getAggregateQuantity());
		Assertions.assertNull(usageReport.getEntitledQuantity());
		Assertions.assertNull(usageReport.getOverageAmount());
		Assertions.assertNull(usageReport.getOverageQuantity());
		Assertions.assertNull(usageReport.getOverageSkuQuantity());
	}

	@Test
	public void testReviewStatusFallsBackToPlainString() {
		UsageReport usageReport = new UsageReport(
			new JSONObject(
			).put(
				"id", 1L
			).put(
				"reviewStatus", "approved"
			));

		Assertions.assertEquals("approved", usageReport.getReviewStatus());
	}

	@Test
	public void testReviewStatusReadsNestedKeyObject() {
		UsageReport usageReport = new UsageReport(
			new JSONObject(
			).put(
				"id", 1L
			).put(
				"reviewStatus",
				new JSONObject(
				).put(
					"key", "pending"
				).put(
					"name", "Pending"
				)
			));

		Assertions.assertEquals("pending", usageReport.getReviewStatus());
	}

}