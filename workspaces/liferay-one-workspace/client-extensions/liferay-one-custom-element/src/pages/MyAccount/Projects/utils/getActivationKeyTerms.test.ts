/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getActivationKeyTerms from './getActivationKeyTerms';

import type {ProjectContract} from '~/hooks/useProjectCommerce';
import type {CommonLicenseKey} from '~/services/spring-boot/CommonLicenseKeys';

type Dates = {
	endDate?: string;
	startDate?: string;
};

function buildContract(dates: Dates): ProjectContract {
	return dates as ProjectContract;
}

function buildKey(
	id: number,
	{endDate, startDate}: Required<Dates>
): CommonLicenseKey {
	return {
		endDate,
		id,
		name: `key-${id}.json`,
		productEnvironment: 'production',
		startDate,
	};
}

const anyKey = buildKey(1, {
	endDate: '2030-01-01T00:00:00.000Z',
	startDate: '2020-01-01T00:00:00.000Z',
});

function toDateRanges(terms: {endDate: string; startDate: string}[]) {
	return terms.map(({endDate, startDate}) => [startDate, endDate]);
}

describe('[MOD-MYACCOUNT-PROJECTS-GETACTIVATIONKEYTERMS] getActivationKeyTerms', () => {
	it('shows the contract term and not the validity of a key that starts a year earlier', () => {
		const key = buildKey(1, {
			endDate: '2027-09-01T00:00:00.000Z',
			startDate: '2025-08-01T00:00:00.000Z',
		});

		expect(
			getActivationKeyTerms(
				buildContract({
					endDate: '2027-08-22T00:00:00.000Z',
					startDate: '2026-08-23T00:00:00.000Z',
				}),
				[key]
			)
		).toEqual([
			{
				endDate: '2027-08-22T00:00:00.000Z',
				id: '2026-08-23T00:00:00.000Z',
				key,
				startDate: '2026-08-23T00:00:00.000Z',
			},
		]);
	});

	it('does not give a term the key of the previous term that ends on its first day', () => {
		const previousKey = buildKey(1, {
			endDate: '2026-08-23T23:59:59.000Z',
			startDate: '2025-08-23T00:00:00.000Z',
		});

		const termKey = buildKey(2, {
			endDate: '2027-08-23T23:59:59.000Z',
			startDate: '2026-08-01T00:00:00.000Z',
		});

		const [term] = getActivationKeyTerms(
			buildContract({
				endDate: '2027-08-22T00:00:00.000Z',
				startDate: '2026-08-23T00:00:00.000Z',
			}),
			[previousKey, termKey]
		);

		expect(term.key).toBe(termKey);
	});

	it('divides a contract of three years into three yearly terms', () => {
		const terms = getActivationKeyTerms(
			buildContract({
				endDate: '2028-08-22T00:00:00.000Z',
				startDate: '2025-08-23T00:00:00.000Z',
			}),
			[anyKey]
		);

		expect(toDateRanges(terms)).toEqual([
			['2025-08-23T00:00:00.000Z', '2026-08-22T00:00:00.000Z'],
			['2026-08-23T00:00:00.000Z', '2027-08-22T00:00:00.000Z'],
			['2027-08-23T00:00:00.000Z', '2028-08-22T00:00:00.000Z'],
		]);
	});

	it('reads an end date on the anniversary as the day after the last term', () => {
		const terms = getActivationKeyTerms(
			buildContract({
				endDate: '2027-08-09T00:00:00.000Z',
				startDate: '2026-08-09T00:00:00.000Z',
			}),
			[anyKey]
		);

		expect(toDateRanges(terms)).toEqual([
			['2026-08-09T00:00:00.000Z', '2027-08-08T00:00:00.000Z'],
		]);
	});

	it('ends a partial last term on the contract end date', () => {
		const terms = getActivationKeyTerms(
			buildContract({
				endDate: '2027-06-30T00:00:00.000Z',
				startDate: '2026-01-15T00:00:00.000Z',
			}),
			[anyKey]
		);

		expect(toDateRanges(terms)).toEqual([
			['2026-01-15T00:00:00.000Z', '2027-01-14T00:00:00.000Z'],
			['2027-01-15T00:00:00.000Z', '2027-06-30T00:00:00.000Z'],
		]);
	});

	it('gives each term the key that covers the most of it', () => {
		const firstKey = buildKey(1, {
			endDate: '2026-08-23T00:00:00.000Z',
			startDate: '2025-08-23T00:00:00.000Z',
		});

		const secondKey = buildKey(2, {
			endDate: '2027-08-23T00:00:00.000Z',
			startDate: '2026-08-23T00:00:00.000Z',
		});

		const terms = getActivationKeyTerms(
			buildContract({
				endDate: '2027-08-22T00:00:00.000Z',
				startDate: '2025-08-23T00:00:00.000Z',
			}),
			[secondKey, firstKey]
		);

		expect(terms.map(({key}) => key)).toEqual([firstKey, secondKey]);
	});

	it('gives a term the key that ends later when two keys cover all of it', () => {
		const earlierKey = buildKey(1, {
			endDate: '2027-12-31T00:00:00.000Z',
			startDate: '2026-01-01T00:00:00.000Z',
		});

		const laterKey = buildKey(2, {
			endDate: '2028-06-01T00:00:00.000Z',
			startDate: '2026-06-01T00:00:00.000Z',
		});

		const [term] = getActivationKeyTerms(
			buildContract({
				endDate: '2027-08-22T00:00:00.000Z',
				startDate: '2026-08-23T00:00:00.000Z',
			}),
			[laterKey, earlierKey]
		);

		expect(term.key).toBe(laterKey);
	});

	it('leaves a term that no key covers without a key', () => {
		const [term] = getActivationKeyTerms(
			buildContract({
				endDate: '2027-08-22T00:00:00.000Z',
				startDate: '2026-08-23T00:00:00.000Z',
			}),
			[
				buildKey(1, {
					endDate: '2025-01-01T00:00:00.000Z',
					startDate: '2024-01-01T00:00:00.000Z',
				}),
			]
		);

		expect(term.key).toBeUndefined();
	});

	it.each([
		['no contract', undefined],
		[
			'a contract with no end date',
			buildContract({startDate: '2026-08-23T00:00:00.000Z'}),
		],
		[
			'a contract with no start date',
			buildContract({endDate: '2027-08-22T00:00:00.000Z'}),
		],
	])('shows the validity of each key for %s', (_, contract) => {
		const key = buildKey(1, {
			endDate: '2027-09-01T00:00:00.000Z',
			startDate: '2025-08-01T00:00:00.000Z',
		});

		expect(getActivationKeyTerms(contract, [key])).toEqual([
			{
				endDate: '2027-09-01T00:00:00.000Z',
				id: '1',
				key,
				startDate: '2025-08-01T00:00:00.000Z',
			},
		]);
	});

	it('gives each key its own ID when two keys of a contract with no end date start on the same day', () => {
		const terms = getActivationKeyTerms(
			buildContract({startDate: '2026-08-23T00:00:00.000Z'}),
			[
				buildKey(1, {
					endDate: '2027-08-23T00:00:00.000Z',
					startDate: '2026-08-23T00:00:00.000Z',
				}),
				buildKey(2, {
					endDate: '2027-08-23T00:00:00.000Z',
					startDate: '2026-08-23T00:00:00.000Z',
				}),
			]
		);

		expect(terms.map(({id}) => id)).toEqual(['1', '2']);
	});

	it('shows no terms when the subscription has no keys', () => {
		expect(
			getActivationKeyTerms(
				buildContract({
					endDate: '2027-08-22T00:00:00.000Z',
					startDate: '2026-08-23T00:00:00.000Z',
				}),
				[]
			)
		).toEqual([]);
	});

	it('shows the validity of each key when the contract is longer than ten years', () => {
		const terms = getActivationKeyTerms(
			buildContract({
				endDate: '9999-12-31T00:00:00.000Z',
				startDate: '2026-08-23T00:00:00.000Z',
			}),
			[anyKey]
		);

		expect(terms.map(({id}) => id)).toEqual(['1']);
	});

	it('divides a contract of ten years into ten yearly terms', () => {
		const terms = getActivationKeyTerms(
			buildContract({
				endDate: '2036-08-22T00:00:00.000Z',
				startDate: '2026-08-23T00:00:00.000Z',
			}),
			[anyKey]
		);

		expect(terms).toHaveLength(10);
	});

	it('starts every term on February 28 in a year without February 29', () => {
		const terms = getActivationKeyTerms(
			buildContract({
				endDate: '2028-02-28T00:00:00.000Z',
				startDate: '2024-02-29T00:00:00.000Z',
			}),
			[anyKey]
		);

		expect(toDateRanges(terms)).toEqual([
			['2024-02-29T00:00:00.000Z', '2025-02-27T00:00:00.000Z'],
			['2025-02-28T00:00:00.000Z', '2026-02-27T00:00:00.000Z'],
			['2026-02-28T00:00:00.000Z', '2027-02-27T00:00:00.000Z'],
			['2027-02-28T00:00:00.000Z', '2028-02-28T00:00:00.000Z'],
		]);
	});
});
