/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.one.model.Contract;
import com.liferay.one.salesforce.model.SalesforceOpportunityLineItem;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * @author Ryan Schuhler
 */
public class ContractUtil {

	public static Contract fetchEndDateContract(
		List<Contract> contracts, Instant endDateInstant) {

		if ((contracts == null) || (endDateInstant == null)) {
			return null;
		}

		List<Contract> matchingContracts = new ArrayList<>();

		for (Contract contract : contracts) {
			if (!isEndDateMatch(contract, endDateInstant)) {
				continue;
			}

			matchingContracts.add(contract);
		}

		if (matchingContracts.size() == 1) {
			return matchingContracts.get(0);
		}

		return null;
	}

	public static Map<String, Long> getContractIds(
		List<Contract> contracts,
		List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems) {

		Map<String, Long> contractIds = new HashMap<>();

		for (SalesforceOpportunityLineItem salesforceOpportunityLineItem :
				salesforceOpportunityLineItems) {

			Contract contract = matchContract(
				contracts, salesforceOpportunityLineItem.getEndDateInstant());

			if (contract == null) {
				continue;
			}

			contractIds.put(
				salesforceOpportunityLineItem.getId(), contract.getId());
		}

		return contractIds;
	}

	public static boolean isEndDateMatch(
		Contract contract, Instant endDateInstant) {

		if ((contract == null) || (contract.getEndDateInstant() == null) ||
			(endDateInstant == null)) {

			return false;
		}

		Instant contractEndDateInstant = contract.getEndDateInstant(
		).plus(
			1, ChronoUnit.DAYS
		);

		return Objects.equals(contractEndDateInstant, endDateInstant);
	}

	public static Contract matchContract(
		List<Contract> contracts, Instant endDateInstant) {

		if ((contracts == null) || contracts.isEmpty() ||
			(endDateInstant == null)) {

			return null;
		}

		Contract contract = fetchEndDateContract(contracts, endDateInstant);

		if ((contract == null) && (contracts.size() == 1)) {
			return contracts.get(0);
		}

		return contract;
	}

}