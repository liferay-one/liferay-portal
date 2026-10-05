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
@DisplayName("[CLS-CONTRACT] Contract")
public class ContractTest {

	@Test
	public void testContractTypeIsNullWithoutContractTypeObject() {
		Assertions.assertNull(
			new Contract(
				new JSONObject()
			).getContractType());
		Assertions.assertNull(
			new Contract(
				new JSONObject(
				).put(
					"contractType", new JSONObject()
				)
			).getContractType());
	}

	@Test
	public void testEndDateInstantIsNullWhenBlank() {
		Assertions.assertNull(
			new Contract(
				new JSONObject()
			).getEndDateInstant());
		Assertions.assertNull(
			new Contract(
				new JSONObject(
				).put(
					"endDate", ""
				)
			).getEndDateInstant());
	}

	@Test
	public void testFieldsReadFromJSON() {
		Contract contract = new Contract(
			new JSONObject(
			).put(
				"contractType",
				new JSONObject(
				).put(
					"key", "subscription"
				)
			).put(
				"endDate", "2027-06-30T00:00:00Z"
			).put(
				"externalReferenceCode", "CONTRACT_ERC"
			).put(
				"id", 9L
			).put(
				"opportunityId", "OPP-1"
			).put(
				"r_originalContractToContract_c_contractERC", "ORIGINAL_ERC"
			).put(
				"r_projectToContract_c_projectERC", "PROJECT_ERC"
			).put(
				"renewalOpportunityId", "OPP-2"
			));

		Assertions.assertEquals("subscription", contract.getContractType());
		Assertions.assertEquals(
			Instant.parse("2027-06-30T00:00:00Z"),
			contract.getEndDateInstant());
		Assertions.assertEquals(
			"CONTRACT_ERC", contract.getExternalReferenceCode());
		Assertions.assertEquals(9L, contract.getId());
		Assertions.assertEquals("OPP-1", contract.getOpportunityId());
		Assertions.assertEquals(
			"ORIGINAL_ERC",
			contract.getOriginalContractExternalReferenceCode());
		Assertions.assertEquals(
			"PROJECT_ERC", contract.getProjectExternalReferenceCode());
		Assertions.assertEquals("OPP-2", contract.getRenewalOpportunityId());
	}

}