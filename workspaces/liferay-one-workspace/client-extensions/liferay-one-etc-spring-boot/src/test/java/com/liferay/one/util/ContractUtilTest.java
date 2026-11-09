/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.one.model.Contract;

import java.time.Instant;

import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Felipe Franca
 */
@DisplayName("[CLS-CONTRACTUTIL] ContractUtil")
public class ContractUtilTest {

	@Test
	public void testFetchContractIgnoresAContractWithoutAnEndDate() {
		Contract contract = _createContract("C1", 1L, null, null);

		Assertions.assertNull(
			ContractUtil.fetchContract(
				List.of(contract), Instant.parse(_LINE_END_DATE), null));
	}

	@Test
	public void testFetchContractMatchesTheEndDateOfTheLastDayOfTheContract() {
		Contract contract1 = _createContract(
			"C1", 1L, "2026-12-31T00:00:00Z", "2026-01-01T00:00:00Z");
		Contract contract2 = _createContract(
			"C2", 2L, _CONTRACT_END_DATE, "2027-01-01T00:00:00Z");

		Assertions.assertSame(
			contract2,
			ContractUtil.fetchContract(
				List.of(contract1, contract2), Instant.parse(_LINE_END_DATE),
				null));
		Assertions.assertSame(
			contract1,
			ContractUtil.fetchContract(
				List.of(contract1, contract2),
				Instant.parse("2027-01-01T00:00:00Z"), null));
	}

	@Test
	public void testFetchContractReturnsNullForANullEndDate() {
		Assertions.assertNull(
			ContractUtil.fetchContract(
				List.of(
					_createContract(
						"C1", 1L, _CONTRACT_END_DATE, _CONTRACT_START_DATE)),
				null, null));
	}

	@Test
	public void testFetchContractReturnsNullWithoutContracts() {
		Assertions.assertNull(
			ContractUtil.fetchContract(
				List.of(), Instant.parse(_LINE_END_DATE), null));
	}

	@Test
	public void testFetchContractReturnsNullWithoutMatchingEndDate() {
		Assertions.assertNull(
			ContractUtil.fetchContract(
				List.of(
					_createContract(
						"C1", 1L, _CONTRACT_END_DATE, _CONTRACT_START_DATE)),
				Instant.parse("2028-12-01T00:00:00Z"), null));
	}

	@Test
	public void testFetchContractSharedEndDateAndStartDateMatchesNoContract() {
		Contract contract1 = _createContract(
			"C2", 2L, _CONTRACT_END_DATE, _CONTRACT_START_DATE);
		Contract contract2 = _createContract(
			"C1", 1L, _CONTRACT_END_DATE, _CONTRACT_START_DATE);
		Contract contract3 = _createContract(
			"C3", 3L, _CONTRACT_END_DATE, "2027-02-01T00:00:00Z");

		Assertions.assertNull(
			ContractUtil.fetchContract(
				List.of(contract1, contract2, contract3),
				Instant.parse(_LINE_END_DATE),
				Instant.parse(_CONTRACT_START_DATE)));
	}

	@Test
	public void testFetchContractSharedEndDateIsDecidedByTheStartDate() {
		Contract contract1 = _createContract(
			"C1", 1L, _CONTRACT_END_DATE, "2026-11-01T00:00:00Z");
		Contract contract2 = _createContract(
			"C2", 2L, _CONTRACT_END_DATE, _CONTRACT_START_DATE);

		Assertions.assertSame(
			contract2,
			ContractUtil.fetchContract(
				List.of(contract1, contract2), Instant.parse(_LINE_END_DATE),
				Instant.parse(_CONTRACT_START_DATE)));
	}

	@Test
	public void testFetchContractSharedEndDateWithoutAMatchingStartDateMatchesNoContract() {
		Contract contract1 = _createContract(
			"C2", 2L, _CONTRACT_END_DATE, "2026-11-01T00:00:00Z");
		Contract contract2 = _createContract(
			"C1", 1L, _CONTRACT_END_DATE, _CONTRACT_START_DATE);

		Assertions.assertNull(
			ContractUtil.fetchContract(
				List.of(contract1, contract2), Instant.parse(_LINE_END_DATE),
				null));
	}

	private Contract _createContract(
		String externalReferenceCode, long id, String endDate,
		String startDate) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"externalReferenceCode", externalReferenceCode
		).put(
			"id", id
		);

		if (endDate != null) {
			jsonObject.put("endDate", endDate);
		}

		if (startDate != null) {
			jsonObject.put("startDate", startDate);
		}

		return new Contract(jsonObject);
	}

	private static final String _CONTRACT_END_DATE = "2027-11-30T00:00:00Z";

	private static final String _CONTRACT_START_DATE = "2026-12-01T00:00:00Z";

	private static final String _LINE_END_DATE = "2027-12-01T00:00:00Z";

}