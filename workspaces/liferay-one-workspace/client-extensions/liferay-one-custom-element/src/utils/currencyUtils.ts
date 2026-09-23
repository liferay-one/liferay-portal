/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import EURFlag from '../assets/icons/eur_flag.svg';
import {formatCurrency} from './formatCurrency';

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

export const CURRENCY_EXCHANGE_RATES: Record<string, number> = {
	AUD: 1.4064,
	BRL: 5.1231,
	CAD: 1.4044,
	CNY: 6.7001,
	EUR: 0.8724,
	GBP: 0.7483,
	HKD: 7.8434,
	INR: 95.595,
	JPY: 157.1753,
	SGD: 1.2747,
	USD: 1.0,
};

export function convertCurrency(
	amount: number,
	fromCurrency: string = 'USD',
	toCurrency: string = 'USD'
): number {
	if (!amount) {
		return 0;
	}

	if (fromCurrency === toCurrency) {
		return amount;
	}

	const fromRate = CURRENCY_EXCHANGE_RATES[fromCurrency] || 1.0;
	const toRate = CURRENCY_EXCHANGE_RATES[toCurrency] || 1.0;

	const amountInUSD = amount / fromRate;
	const converted = amountInUSD * toRate;

	if (toCurrency === 'JPY') {
		return Math.round(converted);
	}

	return Math.round(converted * 100) / 100;
}

export function convertFromUSD(
	amountInUSD: number,
	targetCurrency: string = 'USD'
): number {
	return convertCurrency(amountInUSD, 'USD', targetCurrency);
}

export function getCurrencyForCountry(country?: string): string {
	if (!country) {
		return 'USD';
	}

	return COUNTRY_TO_CURRENCY_MAP[country] || 'USD';
}

export function getCurrencyForLocale(locale: string = 'en_US'): string {
	const normalizedLocale = locale.replace('-', '_');

	return SUPPORTED_LOCALES_CURRENCIES[normalizedLocale] || 'USD';
}

export function getCurrencyFromFormattedString(
	formattedPrice?: string
): string {
	if (!formattedPrice) {
		return 'USD';
	}

	if (formattedPrice.includes('£')) {
		return 'GBP';
	}

	if (formattedPrice.includes('€')) {
		return 'EUR';
	}

	if (formattedPrice.includes('¥')) {
		return 'JPY';
	}

	if (formattedPrice.includes('₹')) {
		return 'INR';
	}

	if (formattedPrice.includes('R$')) {
		return 'BRL';
	}

	if (formattedPrice.includes('$')) {
		return 'USD';
	}

	return 'USD';
}

export function formatProductPrice(
	price: number,
	priceFormatted: string | undefined,
	targetCurrency: string
): string {
	if (!price && !priceFormatted) {
		return formatCurrency(0, targetCurrency);
	}

	const sourceCurrency = getCurrencyFromFormattedString(priceFormatted);

	if (sourceCurrency === targetCurrency && priceFormatted) {
		return priceFormatted;
	}

	const converted = convertCurrency(price, sourceCurrency, targetCurrency);

	return formatCurrency(converted, targetCurrency);
}
