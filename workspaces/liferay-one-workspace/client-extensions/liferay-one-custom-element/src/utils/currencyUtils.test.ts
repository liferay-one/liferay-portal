/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	convertCurrency,
	convertFromUSD,
	formatCurrency,
	formatProductPrice,
	getCurrencyForCountry,
	getCurrencyForLocale,
	getCurrencyFromFormattedString,
} from './currencyUtils';

describe('[MOD-CURRENCYUTILS] currencyUtils', () => {
	describe('convertCurrency', () => {
		it('returns 0 for a zero amount', () => {
			expect(convertCurrency(0, 'USD', 'EUR')).toBe(0);
		});

		it('returns the same amount for equal currencies', () => {
			expect(convertCurrency(12.345, 'EUR', 'EUR')).toBe(12.345);
		});

		it('converts through USD and rounds to 2 decimals', () => {
			expect(convertCurrency(100, 'USD', 'EUR')).toBe(87.24);
			expect(convertCurrency(87.24, 'EUR', 'GBP')).toBe(74.83);
		});

		it('rounds JPY to whole units', () => {
			expect(convertCurrency(10, 'USD', 'JPY')).toBe(1572);
		});

		it('treats an unknown currency code as rate 1', () => {
			expect(convertCurrency(100, 'XYZ', 'EUR')).toBe(87.24);
			expect(convertCurrency(100, 'EUR', 'XYZ')).toBe(114.63);
		});

		it('defaults both currencies to USD', () => {
			expect(convertCurrency(5)).toBe(5);
			expect(convertFromUSD(100, 'INR')).toBe(9559.5);
		});
	});

	describe('getCurrencyFromFormattedString', () => {
		it('detects the currency symbol', () => {
			expect(getCurrencyFromFormattedString('£10.00')).toBe('GBP');
			expect(getCurrencyFromFormattedString('10,00 €')).toBe('EUR');
			expect(getCurrencyFromFormattedString('¥1,000')).toBe('JPY');
			expect(getCurrencyFromFormattedString('₹500')).toBe('INR');
			expect(getCurrencyFromFormattedString('R$ 50,00')).toBe('BRL');
			expect(getCurrencyFromFormattedString('$10.00')).toBe('USD');
		});

		it('defaults to USD', () => {
			expect(getCurrencyFromFormattedString()).toBe('USD');
			expect(getCurrencyFromFormattedString('10.00')).toBe('USD');
		});
	});

	describe('formatProductPrice', () => {
		it('keeps the formatted price when the source currency equals the target', () => {
			expect(formatProductPrice(10, '€ 10,00', 'EUR')).toBe('€ 10,00');
		});

		it('converts and formats when the currencies differ', () => {
			expect(formatProductPrice(100, '$100.00', 'EUR')).toBe(
				formatCurrency(87.24, 'EUR')
			);
		});

		it('formats zero without a price', () => {
			expect(formatProductPrice(0, undefined, 'USD')).toBe('$0.00');
		});

		it('treats a price without a formatted string as USD', () => {
			expect(formatProductPrice(100, undefined, 'USD')).toBe('$100.00');
		});
	});

	describe('lookups', () => {
		it('maps a country to its currency and defaults to USD', () => {
			expect(getCurrencyForCountry('Japan')).toBe('JPY');
			expect(getCurrencyForCountry('Germany')).toBe('EUR');
			expect(getCurrencyForCountry('Atlantis')).toBe('USD');
			expect(getCurrencyForCountry()).toBe('USD');
		});

		it('maps a locale to its currency and defaults to USD', () => {
			expect(getCurrencyForLocale('pt-BR')).toBe('BRL');
			expect(getCurrencyForLocale('en_GB')).toBe('GBP');
			expect(getCurrencyForLocale('zh_CN')).toBe('USD');
			expect(getCurrencyForLocale()).toBe('USD');
		});
	});
});
