/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import escapeODataString from './escapeODataString';

describe('[MOD-ESCAPEODATASTRING] escapeODataString', () => {
	it('doubles every single quote', () => {
		expect(escapeODataString("O'Brien's ' or 1 eq 1")).toBe(
			"O''Brien''s '' or 1 eq 1"
		);
	});

	it('leaves other text untouched', () => {
		expect(escapeODataString('Acme "Corp" & Co')).toBe('Acme "Corp" & Co');
	});
});
