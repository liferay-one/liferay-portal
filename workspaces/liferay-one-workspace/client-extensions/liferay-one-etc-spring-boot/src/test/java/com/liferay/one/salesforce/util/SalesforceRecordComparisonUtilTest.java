/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.salesforce.util;

import com.liferay.one.salesforce.model.SalesforceRecordComparison;

import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CLS-SALESFORCERECORDCOMPARISONUTIL] SalesforceRecordComparisonUtil"
)
public class SalesforceRecordComparisonUtilTest {

	@Test
	public void testCompareWhenContractDatesAndTermMatchInAnotherFormat() {
		List<SalesforceRecordComparison> salesforceRecordComparisons =
			SalesforceRecordComparisonUtil.compare(
				SalesforceRecordComparisonUtil.contractFieldNames,
				List.of(
					new JSONObject(
					).put(
						"contractTerm", 12
					).put(
						"endDate", "2027-01-31T00:00:00Z"
					).put(
						"externalReferenceCode", "800A"
					).put(
						"opportunityId", JSONObject.NULL
					).put(
						"startDate", "2026-02-01T00:00:00Z"
					)),
				List.of(
					new JSONObject(
					).put(
						"ContractTerm", "12.0"
					).put(
						"EndDate", "2027-01-31"
					).put(
						"Id", "800A"
					).put(
						"SBQQ__Opportunity__c", ""
					).put(
						"StartDate", "2026-02-01"
					)),
				SalesforceRecordComparison.TYPE_CONTRACT);

		Assertions.assertEquals(1, salesforceRecordComparisons.size());

		SalesforceRecordComparison salesforceRecordComparison =
			salesforceRecordComparisons.get(0);

		Assertions.assertTrue(
			salesforceRecordComparison.getDifferenceJSONObjects(
			).isEmpty());
		Assertions.assertEquals("800A", salesforceRecordComparison.getName());
		Assertions.assertEquals(
			SalesforceRecordComparison.STATUS_IN_SYNC,
			salesforceRecordComparison.getStatus());
	}

	@Test
	public void testCompareWhenDescriptionLineBreaksDiffer() {
		List<SalesforceRecordComparison> salesforceRecordComparisons =
			SalesforceRecordComparisonUtil.compare(
				SalesforceRecordComparisonUtil.accountFieldNames,
				List.of(
					new JSONObject(
					).put(
						"description", "First line\nSecond line"
					).put(
						"externalReferenceCode", "001A"
					)),
				List.of(
					new JSONObject(
					).put(
						"Description", "First line\r\nSecond line"
					).put(
						"Id", "001A"
					)),
				SalesforceRecordComparison.TYPE_ACCOUNT);

		Assertions.assertEquals(
			SalesforceRecordComparison.STATUS_IN_SYNC,
			salesforceRecordComparisons.get(
				0
			).getStatus());
	}

	@Test
	public void testCompareWhenProjectFieldsDiffer() {
		JSONObject salesforceJSONObject = new JSONObject(
		).put(
			"Allowed_Email_Domains__c", ""
		).put(
			"Id", "a0P1"
		).put(
			"Liferay_Version__c", "2025.Q1"
		).put(
			"Name", " Project One "
		);

		List<SalesforceRecordComparison> salesforceRecordComparisons =
			SalesforceRecordComparisonUtil.compare(
				SalesforceRecordComparisonUtil.projectFieldNames,
				List.of(
					new JSONObject(
					).put(
						"allowedEmailDomains", "liferay.com"
					).put(
						"externalReferenceCode", "a0P1"
					).put(
						"name", "Project One"
					)),
				List.of(salesforceJSONObject),
				SalesforceRecordComparison.TYPE_PROJECT);

		Assertions.assertEquals(1, salesforceRecordComparisons.size());

		SalesforceRecordComparison salesforceRecordComparison =
			salesforceRecordComparisons.get(0);

		List<JSONObject> differenceJSONObjects =
			salesforceRecordComparison.getDifferenceJSONObjects();

		Assertions.assertEquals(1, differenceJSONObjects.size());

		JSONObject differenceJSONObject = differenceJSONObjects.get(0);

		Assertions.assertEquals(
			"liferayVersion", differenceJSONObject.getString("fieldName"));
		Assertions.assertEquals(
			"", differenceJSONObject.getString("liferayValue"));
		Assertions.assertEquals(
			"2025.Q1", differenceJSONObject.getString("salesforceValue"));

		Assertions.assertEquals(
			"Project One", salesforceRecordComparison.getName());
		Assertions.assertSame(
			salesforceJSONObject,
			salesforceRecordComparison.getSalesforceJSONObject());
		Assertions.assertEquals(
			SalesforceRecordComparison.STATUS_DIFFERS,
			salesforceRecordComparison.getStatus());
		Assertions.assertEquals(
			SalesforceRecordComparison.TYPE_PROJECT,
			salesforceRecordComparison.getType());
	}

	@Test
	public void testCompareWhenRecordsAreMissingOnOneSide() {
		List<SalesforceRecordComparison> salesforceRecordComparisons =
			SalesforceRecordComparisonUtil.compare(
				SalesforceRecordComparisonUtil.projectFieldNames,
				List.of(
					new JSONObject(
					).put(
						"externalReferenceCode", "a0P2"
					).put(
						"name", "Liferay Only"
					)),
				List.of(
					new JSONObject(
					).put(
						"Id", "a0P3"
					).put(
						"Name", "Salesforce Only"
					)),
				SalesforceRecordComparison.TYPE_PROJECT);

		Assertions.assertEquals(2, salesforceRecordComparisons.size());

		SalesforceRecordComparison salesforceRecordComparison =
			salesforceRecordComparisons.get(0);

		Assertions.assertEquals(
			"a0P3", salesforceRecordComparison.getExternalReferenceCode());
		Assertions.assertEquals(
			"Salesforce Only", salesforceRecordComparison.getName());
		Assertions.assertEquals(
			SalesforceRecordComparison.STATUS_MISSING_IN_LIFERAY,
			salesforceRecordComparison.getStatus());

		salesforceRecordComparison = salesforceRecordComparisons.get(1);

		Assertions.assertEquals(
			"a0P2", salesforceRecordComparison.getExternalReferenceCode());
		Assertions.assertEquals(
			"Liferay Only", salesforceRecordComparison.getName());
		Assertions.assertNull(
			salesforceRecordComparison.getSalesforceJSONObject());
		Assertions.assertEquals(
			SalesforceRecordComparison.STATUS_MISSING_IN_SALESFORCE,
			salesforceRecordComparison.getStatus());
	}

	@Test
	public void testHasSameValues() {
		JSONObject jsonObject = new JSONObject(
		).put(
			"endDate", "2027-01-31T00:00:00Z"
		).put(
			"externalReferenceCode", "800A"
		);

		Assertions.assertTrue(
			SalesforceRecordComparisonUtil.hasSameValues(
				SalesforceRecordComparisonUtil.contractFieldNames, jsonObject,
				new JSONObject(
				).put(
					"endDate", "2027-01-31"
				).put(
					"opportunityId", JSONObject.NULL
				)));
		Assertions.assertFalse(
			SalesforceRecordComparisonUtil.hasSameValues(
				SalesforceRecordComparisonUtil.contractFieldNames, jsonObject,
				new JSONObject(
				).put(
					"endDate", "2027-12-31"
				)));
	}

}