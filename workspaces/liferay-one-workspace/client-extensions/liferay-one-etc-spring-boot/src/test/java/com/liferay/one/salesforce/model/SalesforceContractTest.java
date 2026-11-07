/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.salesforce.model;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Felipe Franca
 */
@DisplayName("[CLS-SALESFORCECONTRACT] SalesforceContract")
public class SalesforceContractTest {

	@Test
	public void testFieldsDefaultToEmptyWhenMissing() {
		SalesforceContract salesforceContract = new SalesforceContract(
			new JSONObject());

		Assertions.assertEquals("", salesforceContract.getAccountId());
		Assertions.assertNull(salesforceContract.getContractTerm());
		Assertions.assertEquals("", salesforceContract.getEndDate());
		Assertions.assertEquals("", salesforceContract.getId());
		Assertions.assertEquals("", salesforceContract.getOpportunityId());
		Assertions.assertEquals(
			"", salesforceContract.getRenewalOpportunityId());
		Assertions.assertEquals("", salesforceContract.getStartDate());
	}

	@Test
	public void testFieldsReadFromJSON() {
		SalesforceContract salesforceContract = new SalesforceContract(
			new JSONObject(
			).put(
				"AccountId", "001-ACCOUNT"
			).put(
				"ContractTerm", 12
			).put(
				"EndDate", "2027-11-30"
			).put(
				"Id", "800-CONTRACT"
			).put(
				"SBQQ__Opportunity__c", "006-OPPORTUNITY"
			).put(
				"SBQQ__RenewalOpportunity__c", "006-RENEWAL"
			).put(
				"StartDate", "2026-12-01"
			));

		Assertions.assertEquals(
			"001-ACCOUNT", salesforceContract.getAccountId());
		Assertions.assertEquals(12, salesforceContract.getContractTerm());
		Assertions.assertEquals("2027-11-30", salesforceContract.getEndDate());
		Assertions.assertEquals("800-CONTRACT", salesforceContract.getId());
		Assertions.assertEquals(
			"006-OPPORTUNITY", salesforceContract.getOpportunityId());
		Assertions.assertEquals(
			"006-RENEWAL", salesforceContract.getRenewalOpportunityId());
		Assertions.assertEquals(
			"2026-12-01", salesforceContract.getStartDate());
	}

}