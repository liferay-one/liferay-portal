/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import filterMemberOptions from './filterMemberOptions';

function option(userId: number, name: string, email: string) {
	return {email, name, userId};
}

const OPTIONS = [
	option(1, 'Ana Silva', 'ana@example.com'),
	option(2, 'Bo Chen', 'bo.chen@partner.com'),
	option(3, 'Cy Anand', 'cy@example.com'),
];

describe('[MOD-MYACCOUNT-PROJECTMEMBERS-FILTERMEMBEROPTIONS] filterMemberOptions', () => {
	it('returns every option for an empty or blank search', () => {
		expect(filterMemberOptions(OPTIONS, '')).toEqual({
			matchCount: 3,
			visibleOptions: OPTIONS,
		});
		expect(filterMemberOptions(OPTIONS, '   ').matchCount).toBe(3);
	});

	it('matches the name ignoring case and surrounding spaces', () => {
		expect(
			filterMemberOptions(OPTIONS, '  ANA ').visibleOptions.map(
				({userId}) => userId
			)
		).toEqual([1, 3]);
	});

	it('matches the email address', () => {
		expect(filterMemberOptions(OPTIONS, 'Partner.com')).toEqual({
			matchCount: 1,
			visibleOptions: [OPTIONS[1]],
		});
	});

	it('returns no options when nothing matches', () => {
		expect(filterMemberOptions(OPTIONS, 'zed')).toEqual({
			matchCount: 0,
			visibleOptions: [],
		});
	});

	it('caps the visible options at the limit and reports every match', () => {
		const options = Array.from({length: 60}, (_, index) =>
			option(index, `Member ${index}`, `member${index}@example.com`)
		);

		const {matchCount, visibleOptions} = filterMemberOptions(
			options,
			'member'
		);

		expect(matchCount).toBe(60);
		expect(visibleOptions).toEqual(options.slice(0, 50));
		expect(
			filterMemberOptions(options, 'member', 5).visibleOptions
		).toHaveLength(5);
	});
});
