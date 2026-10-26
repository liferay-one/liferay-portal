/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getSKUProductRows from './getSKUProductRows';

import type {CatalogIndex} from '~/pages/Admin/ProductInspector/utils/productCatalogUtils';
import type {InspectedProduct} from '~/types/productInspection';

const PRODUCT_A = {
	id: 100,
	skus: [{externalReferenceCode: 'SKU-1', id: 1}],
} as InspectedProduct;

const PRODUCT_B = {
	id: 200,
	skus: [{externalReferenceCode: 'SKU-1', id: 2}],
} as InspectedProduct;

const INDEX: CatalogIndex = {
	entitlementDefinitionsBySKU: new Map(),
	productsBySKU: new Map([['SKU-1', [PRODUCT_A, PRODUCT_B]]]),
	specificationKeys: new Set(),
	usageDefinitionIds: new Set(),
};

describe('[MOD-ADMIN-PRODUCTINSPECTOR-ENTITLEMENTDEFINITIONDETAIL-GETSKUPRODUCTROWS] getSKUProductRows', () => {
	it('gives one row for each product with the SKU, and one row with no product for an unknown SKU, and ignores a repeated SKU', () => {
		const rows = getSKUProductRows(
			{
				id: 500,
				skuExternalReferenceCodes: ['SKU-1', 'SKU-GONE', 'SKU-1'],
			},
			INDEX
		);

		expect(
			rows.map(({id, product, sku, skuExternalReferenceCode}) => ({
				id,
				productId: product?.id,
				skuExternalReferenceCode,
				skuId: sku?.id,
			}))
		).toEqual([
			{
				id: 1,
				productId: 100,
				skuExternalReferenceCode: 'SKU-1',
				skuId: 1,
			},
			{
				id: 2,
				productId: 200,
				skuExternalReferenceCode: 'SKU-1',
				skuId: 2,
			},
			{
				id: -2,
				productId: undefined,
				skuExternalReferenceCode: 'SKU-GONE',
				skuId: undefined,
			},
		]);
	});
});
