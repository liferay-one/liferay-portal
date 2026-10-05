/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.salesforce.model;

import java.time.Instant;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CLS-SALESFORCEOPPORTUNITYLINEITEM] SalesforceOpportunityLineItem"
)
public class SalesforceOpportunityLineItemTest {

	@Test
	public void testDateOnlyValuesParseAsMidnightUTC() {
		SalesforceOpportunityLineItem salesforceOpportunityLineItem =
			new SalesforceOpportunityLineItem(
				new JSONObject(
				).put(
					"End_Date__c", "2027-03-31"
				).put(
					"ServiceDate", "2026-04-01"
				));

		Assertions.assertEquals(
			Instant.parse("2027-03-31T00:00:00Z"),
			salesforceOpportunityLineItem.getEndDateInstant());
		Assertions.assertEquals(
			Instant.parse("2026-04-01T00:00:00Z"),
			salesforceOpportunityLineItem.getServiceDateInstant());
	}

	@Test
	public void testFieldsReadFromJSON() {
		SalesforceOpportunityLineItem salesforceOpportunityLineItem =
			new SalesforceOpportunityLineItem(
				new JSONObject(
				).put(
					"Cloud_Region__c", "us-east1"
				).put(
					"CurrencyIsoCode", "USD"
				).put(
					"Id", "00k1"
				).put(
					"Machine_Type__c", "n2"
				).put(
					"Number_of_Pods__c", 3
				).put(
					"Product_Type__c", "Subscription"
				).put(
					"Product2.Name", "DXP"
				).put(
					"Product2Id", "01t1"
				).put(
					"Quantity", 2
				).put(
					"TotalPrice", 200.5
				).put(
					"UnitPrice", 100.25
				));

		Assertions.assertEquals(
			"us-east1", salesforceOpportunityLineItem.getCloudRegion());
		Assertions.assertEquals(
			"USD", salesforceOpportunityLineItem.getCurrencyIsoCode());
		Assertions.assertEquals("00k1", salesforceOpportunityLineItem.getId());
		Assertions.assertEquals(
			"n2", salesforceOpportunityLineItem.getMachineType());
		Assertions.assertEquals(
			3.0, salesforceOpportunityLineItem.getNumberOfPods());
		Assertions.assertEquals(
			"01t1", salesforceOpportunityLineItem.getProduct2Id());
		Assertions.assertEquals(
			"DXP", salesforceOpportunityLineItem.getProductName());
		Assertions.assertEquals(
			"Subscription", salesforceOpportunityLineItem.getProductType());
		Assertions.assertEquals(
			2.0, salesforceOpportunityLineItem.getQuantity());
		Assertions.assertEquals(
			200.5, salesforceOpportunityLineItem.getTotalPrice());
		Assertions.assertEquals(
			100.25, salesforceOpportunityLineItem.getUnitPrice());
		Assertions.assertFalse(salesforceOpportunityLineItem.isRealignment());
	}

	@Test
	public void testIsRealignmentWhenQuantityIsZeroOrNegative() {
		Assertions.assertTrue(
			_createSalesforceOpportunityLineItem(
				0
			).isRealignment());
		Assertions.assertTrue(
			_createSalesforceOpportunityLineItem(
				-1
			).isRealignment());
		Assertions.assertFalse(
			_createSalesforceOpportunityLineItem(
				0.5
			).isRealignment());
	}

	@Test
	public void testJSONNullsMapToNull() {
		SalesforceOpportunityLineItem salesforceOpportunityLineItem =
			new SalesforceOpportunityLineItem(
				new JSONObject(
				).put(
					"End_Date__c", ""
				).put(
					"Number_of_Pods__c", JSONObject.NULL
				).put(
					"Quantity", JSONObject.NULL
				).put(
					"TotalPrice", JSONObject.NULL
				).put(
					"UnitPrice", JSONObject.NULL
				));

		Assertions.assertNull(
			salesforceOpportunityLineItem.getEndDateInstant());
		Assertions.assertNull(salesforceOpportunityLineItem.getNumberOfPods());
		Assertions.assertNull(salesforceOpportunityLineItem.getQuantity());
		Assertions.assertNull(
			salesforceOpportunityLineItem.getServiceDateInstant());
		Assertions.assertNull(salesforceOpportunityLineItem.getTotalPrice());
		Assertions.assertNull(salesforceOpportunityLineItem.getUnitPrice());
		Assertions.assertFalse(salesforceOpportunityLineItem.isRealignment());
	}

	private SalesforceOpportunityLineItem _createSalesforceOpportunityLineItem(
		double quantity) {

		return new SalesforceOpportunityLineItem(
			new JSONObject(
			).put(
				"Quantity", quantity
			));
	}

}