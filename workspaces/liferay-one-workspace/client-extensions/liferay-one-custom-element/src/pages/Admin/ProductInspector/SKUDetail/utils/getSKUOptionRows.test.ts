/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getSKUOptionRows from './getSKUOptionRows';

import type {ProductOption} from '~/types/product';
import type {InspectedProduct, InspectedSKU} from '~/types/productInspection';

const PRODUCT_OPTION: Partial<ProductOption> = {
	id: 10,
	key: 'tier',
	name: {en_US: 'Tier'},
};

const PRODUCT: Partial<InspectedProduct> = {
	productOptions: [PRODUCT_OPTION as ProductOption],
};

describe('[MOD-ADMIN-PRODUCTINSPECTOR-SKUDETAIL-GETSKUOPTIONROWS] getSKUOptionRows', () => {
	it('names each SKU option by its product option, and keys a row with no option value ID by its position', () => {
		const sku: InspectedSKU = {
			id: 1,
			skuOptions: [
				{key: 'tier', optionId: 10, optionValueId: 11, value: 'gold'},
				{key: 'unknown', value: 'x'},
			],
		};

		expect(getSKUOptionRows(PRODUCT as InspectedProduct, sku)).toEqual([
			{
				id: 11,
				key: 'tier',
				optionId: 10,
				optionName: 'Tier',
				value: 'gold',
			},
			{
				id: -2,
				key: 'unknown',
				optionId: undefined,
				optionName: '',
				value: 'x',
			},
		]);
	});
});
