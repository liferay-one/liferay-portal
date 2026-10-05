/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import formatCurrency from './formatCurrency';

describe('[MOD-FORMATCURRENCY] formatCurrency', () => {
	it('formats in USD and en-US by default', () => {
		expect(formatCurrency(1234.5)).toBe('$1,234.50');
	});

	it('normalizes an underscore locale to a dash', () => {
		expect(formatCurrency(1234.5, 'EUR', 'de_DE')).toBe(
			formatCurrency(1234.5, 'EUR', 'de-DE')
		);
	});

	it('formats JPY without decimals', () => {
		expect(formatCurrency(1234, 'JPY')).toBe('¥1,234');
	});
});
