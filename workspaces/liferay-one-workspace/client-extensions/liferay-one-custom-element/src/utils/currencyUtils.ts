/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import EURFlag from '../assets/icons/eur_flag.svg';

export {formatCurrency} from './formatCurrency';

export type Currency = {
	code: string;
	flag: string;
	iconSrc?: string;
	symbol: string;
};

export const currenciesCode: Currency[] = [
	{
		code: 'USD',
		flag: 'en-us',
		symbol: '$',
	},
	{
		code: 'EUR',
		flag: 'de-de',
		iconSrc: EURFlag,
		symbol: '€',
	},
	{
		code: 'GBP',
		flag: 'en-gb',
		symbol: '£',
	},
	{
		code: 'SGD',
		flag: 'en-sg',
		symbol: '$',
	},
	{
		code: 'INR',
		flag: 'hi-in',
		symbol: '₹',
	},
	{
		code: 'JPY',
		flag: 'ja-jp',
		symbol: '¥',
	},
	{
		code: 'BRL',
		flag: 'pt-br',
		symbol: 'R$',
	},
	{
		code: 'AUD',
		flag: 'en-au',
		symbol: '$',
	},
];

export const SUPPORTED_LOCALES_CURRENCIES: Record<string, string> = {
	de_DE: 'EUR',
	en_AU: 'AUD',
	en_GB: 'GBP',
	en_IN: 'INR',
	en_SG: 'SGD',
	en_US: 'USD',
	es_ES: 'EUR',
	fr_FR: 'EUR',
	it_IT: 'EUR',
	ja_JP: 'JPY',
	pt_BR: 'BRL',
};

export function getCurrencyForLocale(locale: string = 'en_US'): string {
	const normalizedLocale = locale.replace('-', '_');

	return SUPPORTED_LOCALES_CURRENCIES[normalizedLocale] || 'USD';
}

