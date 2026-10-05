/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import sortLiferayVersions from './sortLiferayVersions';

const toOptions = (labels: string[]) =>
	labels.map((label) => ({label, value: label}));

describe('[MOD-BUSINESSEVENTS-SORTLIFERAYVERSIONS] sortLiferayVersions', () => {
	it('orders labels newest first by numeric segments', () => {
		expect(
			sortLiferayVersions(
				toOptions(['7.3', '2025.Q1', '7.4', '2026.Q2', '2025.Q4'])
			).map(({label}) => label)
		).toEqual(['2026.Q2', '2025.Q4', '2025.Q1', '7.4', '7.3']);
	});

	it('splits on dots and spaces', () => {
		expect(
			sortLiferayVersions(toOptions(['DXP 7.4 U10', 'DXP 7.4 U92'])).map(
				({label}) => label
			)
		).toEqual(['DXP 7.4 U92', 'DXP 7.4 U10']);
	});

	it('treats non numeric parts as zero', () => {
		expect(
			sortLiferayVersions(toOptions(['Other', '1.0'])).map(
				({label}) => label
			)
		).toEqual(['1.0', 'Other']);
	});

	it('handles different segment counts', () => {
		expect(
			sortLiferayVersions(toOptions(['7.4', '7.4.3', '7'])).map(
				({label}) => label
			)
		).toEqual(['7.4.3', '7.4', '7']);
	});

	it('does not mutate the input array', () => {
		const items = toOptions(['7.3', '7.4']);

		const sorted = sortLiferayVersions(items);

		expect(sorted).not.toBe(items);
		expect(items.map(({label}) => label)).toEqual(['7.3', '7.4']);
	});
});
