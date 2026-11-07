/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.one.model.Contract;
import com.liferay.petra.string.StringBundler;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

/**
 * @author Felipe Franca
 */
public class ContractUtil {

	public static Contract fetchContract(
		List<Contract> contracts, Instant endDateInstant,
		Instant startDateInstant) {

		if (endDateInstant == null) {
			return null;
		}

		List<Contract> endDateContracts = new ArrayList<>();

		for (Contract contract : contracts) {
			Instant contractEndDateInstant = contract.getEndDateInstant();

			if ((contractEndDateInstant == null) ||
				!endDateInstant.equals(
					contractEndDateInstant.plus(1, ChronoUnit.DAYS))) {

				continue;
			}

			endDateContracts.add(contract);
		}

		if (endDateContracts.isEmpty()) {
			return null;
		}

		if (endDateContracts.size() == 1) {
			return endDateContracts.get(0);
		}

		List<Contract> startDateContracts = new ArrayList<>();

		for (Contract contract : endDateContracts) {
			if (!Objects.equals(
					contract.getStartDateInstant(), startDateInstant)) {

				continue;
			}

			startDateContracts.add(contract);
		}

		if (startDateContracts.isEmpty()) {
			startDateContracts = endDateContracts;
		}

		Contract firstContract = startDateContracts.get(0);

		for (Contract contract : startDateContracts) {
			String externalReferenceCode = contract.getExternalReferenceCode();

			int comparison = externalReferenceCode.compareTo(
				firstContract.getExternalReferenceCode());

			if (comparison >= 0) {
				continue;
			}

			firstContract = contract;
		}

		if (startDateContracts.size() > 1) {
			_warnAmbiguousContracts(endDateInstant, startDateContracts);
		}

		return firstContract;
	}

	private static void _warnAmbiguousContracts(
		Instant endDateInstant, List<Contract> contracts) {

		if (!_log.isWarnEnabled()) {
			return;
		}

		List<String> externalReferenceCodes = new ArrayList<>();

		for (Contract contract : contracts) {
			externalReferenceCodes.add(contract.getExternalReferenceCode());
		}

		_log.warn(
			StringBundler.concat(
				"Several contracts ", externalReferenceCodes,
				" end the day before ", endDateInstant,
				" and cannot be told apart by start date"));
	}

	private static final Log _log = LogFactory.getLog(ContractUtil.class);

}