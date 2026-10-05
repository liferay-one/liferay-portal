/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import formatAddress from './formatAddress';

import type {BillingAddress} from '~/types/orders';

describe('[MOD-FORMATADDRESS] formatAddress', () => {
	it('returns a dash for an empty or missing address', () => {
		expect(formatAddress({})).toBe('-');
		expect(formatAddress(undefined as unknown as BillingAddress)).toBe('-');
	});

	it('joins street, city, region, zip, and the localized country name', () => {
		expect(
			formatAddress({
				city: 'Diamond Bar',
				countryISOCode: 'US',
				regionISOCode: 'CA',
				street1: '1400 Montefino Ave',
				zip: '91765',
			})
		).toBe('1400 Montefino Ave, Diamond Bar, CA, 91765, United States');
	});

	it('drops empty parts', () => {
		expect(
			formatAddress({city: 'Recife', countryISOCode: 'BR', street1: ''})
		).toBe('Recife, Brazil');
	});
});
