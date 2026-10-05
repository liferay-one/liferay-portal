/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getAppType from './getAppType';

import type {DeliveryProduct} from '~/types/product';

function toProduct(type?: string) {
	return {
		productSpecifications: type
			? [{specificationKey: 'type', value: type}]
			: [],
	} as unknown as DeliveryProduct;
}

describe('[MOD-MYACCOUNT-PROJECTS-GETAPPTYPE] getAppType', () => {
	it('returns the known app type case insensitively', () => {
		expect(getAppType(toProduct('Cloud'))).toBe('cloud');
		expect(getAppType(toProduct('LOW-CODE-CONFIGURATION'))).toBe(
			'low-code-configuration'
		);
	});

	it('returns undefined for an unknown or missing type', () => {
		expect(getAppType(toProduct('theme'))).toBeUndefined();
		expect(getAppType(toProduct())).toBeUndefined();
	});
});
