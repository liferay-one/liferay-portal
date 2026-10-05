/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import safeJSONParse from './safeJSONParse';

describe('[MOD-SAFEJSONPARSE] safeJSONParse', () => {
	it('parses a valid JSON string', () => {
		expect(safeJSONParse('{"a":[1,2]}', {})).toEqual({a: [1, 2]});
	});

	it('returns the default for invalid JSON', () => {
		expect(safeJSONParse('{oops', ['fallback'])).toEqual(['fallback']);
	});

	it('returns a truthy default for non string input', () => {
		const defaultValue = {fallback: true};

		expect(safeJSONParse(null, defaultValue)).toBe(defaultValue);
	});
});
