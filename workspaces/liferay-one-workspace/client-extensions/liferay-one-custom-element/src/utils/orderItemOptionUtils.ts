/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {safeJSONParse} from '~/utils/safeJSONParse';

type OrderItemOption = {
	key?: string;
	skuOptionValueNames?: string[];
};

type OrderItem = {
	name: string;
	options?: string;
};

const ENVIRONMENT_PATTERNS: [RegExp, string][] = [
	[/\bnon[- ]?prod(uction)?\b/i, 'non-production'],
	[/\bprod(uction)?\b/i, 'production'],
	[/\bbackup\b/i, 'backup'],
	[/\blimited\b/i, 'limited'],
];

const LICENSE_USAGE_TYPE_OPTION_KEY_SUFFIX = '-license-usage-type';

const NON_PRODUCT_OPTION_KEYS = new Set(['consumption-role', 'machinetype']);

const SALESFORCE_PRODUCT_OPTION_KEY = 'salesforce-product';

const SIZING_PATTERN = /\bsizing[- ]?(\d+)\b/i;

export function getOrderItemProductName(orderItem: OrderItem): string {
	return getProductOptionValueName(orderItem) || orderItem.name;
}

export function getProductOptionValueName({options}: OrderItem): string {
	const parsedOptions = safeJSONParse<OrderItemOption[]>(options ?? null, []);

	const productOptions = (
		Array.isArray(parsedOptions) ? parsedOptions : []
	).filter(isProductOption);

	const productOption =
		productOptions.find(
			(option) => option.key === SALESFORCE_PRODUCT_OPTION_KEY
		) ?? productOptions[0];

	return productOption?.skuOptionValueNames?.[0] ?? '';
}

function isProductOption({key, skuOptionValueNames}: OrderItemOption) {
	return (
		!!skuOptionValueNames?.length &&
		!NON_PRODUCT_OPTION_KEYS.has(key ?? '') &&
		!key?.endsWith(LICENSE_USAGE_TYPE_OPTION_KEY_SUFFIX)
	);
}

export function getOptionValueNames(options?: string): string[] {
	return safeJSONParse<OrderItemOption[]>(options ?? null, []).flatMap(
		(option) => option.skuOptionValueNames ?? []
	);
}

export function getEnvironment(optionValueNames: string[]): string {
	for (const optionValueName of optionValueNames) {
		const environmentPattern = ENVIRONMENT_PATTERNS.find(([pattern]) =>
			pattern.test(optionValueName)
		);

		if (environmentPattern) {
			return environmentPattern[1];
		}
	}

	return '';
}

export function getInstanceSize(optionValueNames: string[]): string {
	for (const optionValueName of optionValueNames) {
		const match = optionValueName.match(SIZING_PATTERN);

		if (match) {
			return match[1];
		}
	}

	return '';
}
