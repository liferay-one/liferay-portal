/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {CatalogIndex} from '~/pages/Admin/ProductInspector/utils/productCatalogUtils';
import type {InspectedEntry} from '~/types/accountInspection';
import type {
	InspectedEntitlementDefinition,
	InspectedProduct,
	InspectedSKU,
} from '~/types/productInspection';

export type SKUProductRow = InspectedEntry & {
	product?: InspectedProduct;
	sku?: InspectedSKU;
	skuExternalReferenceCode: string;
};

function getSKUProductRows(
	{skuExternalReferenceCodes}: InspectedEntitlementDefinition,
	{productsBySKU}: CatalogIndex
): SKUProductRow[] {
	return [...new Set(skuExternalReferenceCodes)].flatMap(
		(skuExternalReferenceCode, position) => {
			const products = productsBySKU?.get(skuExternalReferenceCode);

			if (!products?.length) {
				return [{id: -(position + 1), skuExternalReferenceCode}];
			}

			return products.map((product) => {
				const sku = product.skus.find(
					({externalReferenceCode}) =>
						externalReferenceCode === skuExternalReferenceCode
				);

				return {
					id: sku?.id ?? -(position + 1),
					product,
					sku,
					skuExternalReferenceCode,
				};
			});
		}
	);
}

export default getSKUProductRows;
