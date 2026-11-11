/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {addUTCDays, addUTCYears, startOfUTCDay} from '~/utils/dateUtils';

import type {ProjectContract} from '~/hooks/useProjectCommerce';
import type {CommonLicenseKey} from '~/services/spring-boot/CommonLicenseKeys';

export type ActivationKeyTerm = {
	endDate: string;
	id: string;
	key?: CommonLicenseKey;
	startDate: string;
};

type YearlyTerm = {
	endDay: Date;
	startDay: Date;
};

const MAX_YEARLY_TERMS = 10;

function getOverlapMillis(key: CommonLicenseKey, yearlyTerm: YearlyTerm) {
	const keyEnd = new Date(key.endDate).getTime();
	const keyStart = new Date(key.startDate).getTime();

	return (
		Math.min(keyEnd, addUTCDays(yearlyTerm.endDay, 1).getTime()) -
		Math.max(keyStart, yearlyTerm.startDay.getTime())
	);
}

function findTermKey(
	keys: CommonLicenseKey[],
	yearlyTerm: YearlyTerm
): CommonLicenseKey | undefined {
	let termKey: CommonLicenseKey | undefined;
	let termKeyOverlapMillis = 0;

	for (const key of keys) {
		const overlapMillis = getOverlapMillis(key, yearlyTerm);

		const coversMore = overlapMillis > termKeyOverlapMillis;

		const coversAsMuchAndExpiresLater =
			termKey !== undefined &&
			overlapMillis === termKeyOverlapMillis &&
			new Date(key.endDate) > new Date(termKey.endDate);

		if (coversMore || coversAsMuchAndExpiresLater) {
			termKey = key;
			termKeyOverlapMillis = overlapMillis;
		}
	}

	return termKey;
}

function getYearlyTerms(endDate: string, startDate: string): YearlyTerm[] {
	const contractEndDay = startOfUTCDay(endDate);
	const contractStartDay = startOfUTCDay(startDate);

	const yearlyTerms: YearlyTerm[] = [];

	for (
		let year = 0;
		addUTCYears(contractStartDay, year) < contractEndDay;
		year++
	) {
		if (yearlyTerms.length === MAX_YEARLY_TERMS) {
			return [];
		}

		const nextStartDay = addUTCYears(contractStartDay, year + 1);

		yearlyTerms.push({
			endDay: new Date(
				Math.min(
					addUTCDays(nextStartDay, -1).getTime(),
					contractEndDay.getTime()
				)
			),
			startDay: addUTCYears(contractStartDay, year),
		});
	}

	return yearlyTerms;
}

function toKeyTerms(keys: CommonLicenseKey[]): ActivationKeyTerm[] {
	return keys.map((key) => ({
		endDate: key.endDate,
		id: String(key.id),
		key,
		startDate: key.startDate,
	}));
}

export default function getActivationKeyTerms(
	contract: ProjectContract | undefined,
	keys: CommonLicenseKey[]
): ActivationKeyTerm[] {
	if (!keys.length) {
		return [];
	}

	if (!contract?.startDate || !contract.endDate) {
		return toKeyTerms(keys);
	}

	const yearlyTerms = getYearlyTerms(contract.endDate, contract.startDate);

	if (!yearlyTerms.length) {
		return toKeyTerms(keys);
	}

	return yearlyTerms.map((yearlyTerm) => ({
		endDate: yearlyTerm.endDay.toISOString(),
		id: yearlyTerm.startDay.toISOString(),
		key: findTermKey(keys, yearlyTerm),
		startDate: yearlyTerm.startDay.toISOString(),
	}));
}
