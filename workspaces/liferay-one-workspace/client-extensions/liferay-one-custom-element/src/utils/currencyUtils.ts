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

export const COUNTRY_TO_CURRENCY_MAP: Record<string, string> = {
	'AU': 'AUD',
	'Algeria': 'USD',
	'Andorra': 'EUR',
	'Angola': 'USD',
	'Argentina': 'USD',
	'Australia': 'AUD',
	'Austria': 'EUR',
	'BR': 'USD',
	'Bahrain': 'USD',
	'Bangladesh': 'INR',
	'Belarus': 'EUR',
	'Belgium': 'EUR',
	'Bermuda': 'USD',
	'Brazil': 'USD',
	'Bulgaria': 'EUR',
	'Cambodia': 'USD',
	'Cameroon': 'USD',
	'Canada': 'USD',
	'Cayman Islands': 'USD',
	'Chile': 'USD',
	'China': 'USD',
	'Colombia': 'USD',
	'Costa Rica': 'USD',
	'Croatia': 'EUR',
	'Cyprus': 'EUR',
	'Czech Republic': 'EUR',
	'Czechia': 'EUR',
	'Ecuador': 'USD',
	'Egypt': 'USD',
	'El Salvador': 'USD',
	'Estonia': 'EUR',
	'Ethiopia': 'USD',
	'Finland': 'EUR',
	'France': 'EUR',
	'French Polynesia': 'EUR',
	'GB': 'GBP',
	'Germany': 'EUR',
	'Greece': 'EUR',
	'Guatemala': 'EUR',
	'Hong Kong': 'USD',
	'Hungary': 'EUR',
	'IN': 'INR',
	'India': 'INR',
	'Indonesia': 'USD',
	'Ireland': 'EUR',
	'Israel': 'USD',
	'Italy': 'EUR',
	'Ivory Coast': 'USD',
	'JP': 'JPY',
	'Jamaica': 'USD',
	'Japan': 'JPY',
	'Kenya': 'USD',
	'Kuwait': 'USD',
	'Libyan Arab Jamahiriya': 'USD',
	'Luxembourg': 'EUR',
	'Malaysia': 'USD',
	'Mexico': 'USD',
	'Morocco': 'USD',
	'Netherlands': 'EUR',
	'New Zealand': 'AUD',
	'Norway': 'EUR',
	'Oman': 'USD',
	'Panama': 'USD',
	'Paraguay': 'USD',
	'Peru': 'USD',
	'Poland': 'EUR',
	'Portugal': 'EUR',
	'Qatar': 'USD',
	'Romania': 'EUR',
	'Saudi Arabia': 'USD',
	'Singapore': 'USD',
	'Slovenia': 'EUR',
	'South Africa': 'USD',
	'Spain': 'EUR',
	'Sweden': 'EUR',
	'Switzerland': 'EUR',
	'Taiwan': 'EUR',
	'Taiwan ROC': 'EUR',
	'Thailand': 'USD',
	'Togo': 'USD',
	'Trinidad and Tobago': 'USD',
	'UK': 'GBP',
	'US': 'USD',
	'United Arab Emirates': 'USD',
	'United Kingdom': 'GBP',
	'United States': 'USD',
	'Uruguay': 'USD',
	'Vietnam': 'USD',
};

const regionDisplayNames = new Intl.DisplayNames(['en'], {type: 'region'});

function getCountryName(country: string): string | undefined {
	if (!/^[A-Z]{2}$/.test(country)) {
		return undefined;
	}

	return regionDisplayNames.of(country);
}

export function getCurrencyForCountry(country?: string): string {
	if (!country) {
		return 'USD';
	}

	const countryName = getCountryName(country);

	return (
		COUNTRY_TO_CURRENCY_MAP[country] ||
		(countryName && COUNTRY_TO_CURRENCY_MAP[countryName]) ||
		'USD'
	);
}

export function getCurrencyForLocale(locale: string = 'en_US'): string {
	const normalizedLocale = locale.replace('-', '_');

	return SUPPORTED_LOCALES_CURRENCIES[normalizedLocale] || 'USD';
}
