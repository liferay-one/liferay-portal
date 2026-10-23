/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {safeJSONParse} from '~/utils/safeJSONParse';

type OrderItemOption = {
	skuOptionValueNames?: string[];
};

const ENVIRONMENT_PATTERNS: [RegExp, string][] = [
	[/\bnon[- ]?prod(uction)?\b/i, 'non-production'],
	[/\bprod(uction)?\b/i, 'production'],
	[/\bbackup\b/i, 'backup'],
	[/\blimited\b/i, 'limited'],
];

const SIZING_PATTERN = /\bsizing[- ]?(\d+)\b/i;

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
