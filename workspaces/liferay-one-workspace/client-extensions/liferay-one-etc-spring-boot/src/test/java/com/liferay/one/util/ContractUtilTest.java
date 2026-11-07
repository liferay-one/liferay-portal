/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.one.model.Contract;
import com.liferay.one.salesforce.model.SalesforceOpportunityLineItem;

import java.time.Instant;

import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
public class ContractUtilTest {

	@Test
	public void testFetchEndDateContractDoesNotFallBackToTheOnlyContract() {
		Contract contract = _createContract(1L, "2027-10-31");

		Assertions.assertNull(
			ContractUtil.fetchEndDateContract(
				List.of(contract), _toEndDateInstant("2027-06-30")));
		Assertions.assertSame(
			contract,
			ContractUtil.fetchEndDateContract(
				List.of(contract), _toEndDateInstant("2027-10-31")));
	}

	@Test
	public void testGetContractIdsLinksEachLineItemToTheContractWithItsEndDate() {
		Contract contract1 = _createContract(1L, "2027-10-31");
		Contract contract2 = _createContract(2L, "2028-10-31");
		Contract contract3 = _createContract(3L, "2029-10-31");

		Assertions.assertEquals(
			Map.of("00kA", 1L, "00kB", 2L, "00kC", 3L),
			ContractUtil.getContractIds(
				List.of(contract1, contract2, contract3),
				List.of(
					_createLineItem("00kA", "2027-10-31"),
					_createLineItem("00kB", "2028-10-31"),
					_createLineItem("00kC", "2029-10-31"),
					_createLineItem("00kD", null))));
	}

	@Test
	public void testMatchContractReturnsNullForAmbiguousEndDate() {
		Assertions.assertNull(
			ContractUtil.matchContract(
				List.of(
					_createContract(1L, "2027-10-31"),
					_createContract(2L, "2027-10-31")),
				_toEndDateInstant("2027-10-31")));
	}

	@Test
	public void testMatchContractReturnsNullForUnmatchedEndDateOfSeveralContracts() {
		Assertions.assertNull(
			ContractUtil.matchContract(
				List.of(
					_createContract(1L, "2027-10-31"),
					_createContract(2L, "2028-10-31")),
				_toEndDateInstant("2027-06-30")));
	}

	@Test
	public void testMatchContractReturnsNullWithoutContractsOrEndDate() {
		Assertions.assertNull(
			ContractUtil.matchContract(
				List.of(), _toEndDateInstant("2027-10-31")));
		Assertions.assertNull(
			ContractUtil.matchContract(
				List.of(_createContract(1L, "2027-10-31")), null));
	}

	@Test
	public void testMatchContractReturnsTheOnlyContractForAnyEndDate() {
		Contract contract = _createContract(1L, "2027-10-31");

		Assertions.assertSame(
			contract,
			ContractUtil.matchContract(
				List.of(contract), _toEndDateInstant("2027-06-30")));
	}

	private Contract _createContract(long id, String endDate) {
		return new Contract(
			new JSONObject(
			).put(
				"endDate", endDate + "T00:00:00Z"
			).put(
				"externalReferenceCode", "800" + id
			).put(
				"id", id
			));
	}

	private SalesforceOpportunityLineItem _createLineItem(
		String id, String endDate) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"Id", id
		);

		if (endDate != null) {
			jsonObject.put("End_Date__c", endDate);
		}

		return new SalesforceOpportunityLineItem(jsonObject);
	}

	private Instant _toEndDateInstant(String endDate) {
		SalesforceOpportunityLineItem salesforceOpportunityLineItem =
			_createLineItem("00k", endDate);

		return salesforceOpportunityLineItem.getEndDateInstant();
	}

}