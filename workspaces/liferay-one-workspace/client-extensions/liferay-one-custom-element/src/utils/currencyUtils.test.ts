/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {getCurrencyForCountry, getCurrencyForLocale} from './currencyUtils';

describe('[MOD-CURRENCYUTILS] currencyUtils', () => {
	describe('lookups', () => {
		it('maps a country to its currency and defaults to USD', () => {
			expect(getCurrencyForCountry('Japan')).toBe('JPY');
			expect(getCurrencyForCountry('Germany')).toBe('EUR');
			expect(getCurrencyForCountry('Atlantis')).toBe('USD');
			expect(getCurrencyForCountry()).toBe('USD');
		});

		it('maps an ISO country code to its currency', () => {
			expect(getCurrencyForCountry('CZ')).toBe('EUR');
			expect(getCurrencyForCountry('IT')).toBe('EUR');
			expect(getCurrencyForCountry('JP')).toBe('JPY');
			expect(getCurrencyForCountry('ZZ')).toBe('USD');
		});

		it('maps a locale to its currency and defaults to USD', () => {
			expect(getCurrencyForLocale('pt-BR')).toBe('BRL');
			expect(getCurrencyForLocale('en_GB')).toBe('GBP');
			expect(getCurrencyForLocale('zh_CN')).toBe('USD');
			expect(getCurrencyForLocale()).toBe('USD');
		});
	});
});
