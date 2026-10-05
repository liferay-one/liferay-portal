/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import parseAssociatedTickets from './parseAssociatedTickets';

describe('[MOD-BUSINESSEVENTS-PARSEASSOCIATEDTICKETS] parseAssociatedTickets', () => {
	it('returns an empty array for empty input or the string undefined', () => {
		expect(parseAssociatedTickets(undefined)).toEqual([]);
		expect(parseAssociatedTickets('')).toEqual([]);
		expect(parseAssociatedTickets('undefined')).toEqual([]);
	});

	it('maps a JSON array to strings', () => {
		expect(parseAssociatedTickets('["LPD-1", 2, "LPD-3"]')).toEqual([
			'LPD-1',
			'2',
			'LPD-3',
		]);
	});

	it('wraps a JSON scalar in an array', () => {
		expect(parseAssociatedTickets('12345')).toEqual(['12345']);
		expect(parseAssociatedTickets('"LPD-1"')).toEqual(['LPD-1']);
	});

	it('strips brackets and quotes, splits, trims, and drops empties for non JSON input', () => {
		expect(parseAssociatedTickets("['LPD-1', 'LPD-2',, ]")).toEqual([
			'LPD-1',
			'LPD-2',
		]);
		expect(parseAssociatedTickets('LPD-1, LPD-2')).toEqual([
			'LPD-1',
			'LPD-2',
		]);
	});
});
