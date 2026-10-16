/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Word, translate} from '~/i18n';
import {ipv4Regex, macAddressRegex} from '~/utils/schemaUtils';

function toAddresses(value: string): string[] {
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

function validateAddresses(
	value: string,
	regex: RegExp,
	invalidWord: Word,
	duplicateWord: Word
): string | true {
	const addresses = toAddresses(value);

	if (!addresses.every((address) => regex.test(address))) {
		return translate(invalidWord);
	}

	if (new Set(addresses).size !== addresses.length) {
		return translate(duplicateWord);
	}

	return true;
}

export function validateIPAddresses(value: string): string | true {
	return validateAddresses(
		value,
		ipv4Regex,
		'enter-a-valid-ip-address-on-each-line',
		'remove-the-duplicate-ip-addresses'
	);
}

export function validateMACAddresses(value: string): string | true {
	return validateAddresses(
		value,
		macAddressRegex,
		'enter-a-valid-mac-address-on-each-line',
		'remove-the-duplicate-mac-addresses'
	);
}
