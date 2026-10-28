/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {getLocalizedValue} from '~/pages/Admin/ProductInspector/utils/productCatalogUtils';

import type {InspectedEntry} from '~/types/accountInspection';
import type {InspectedProduct, InspectedSKU} from '~/types/productInspection';

export type SKUOptionRow = InspectedEntry & {
	key: string;
	optionId?: number;
	optionName: string;
	value: string;
};

function getSKUOptionRows(
	product: InspectedProduct,
	sku: InspectedSKU
): SKUOptionRow[] {
	const productOptionsById = new Map(
		(product.productOptions ?? []).map((productOption) => [
			productOption.id,
			productOption,
		])
	);

	return (sku.skuOptions ?? []).map(
		({key, optionId, optionValueId, value}, position) => ({
			id: optionValueId ?? -(position + 1),
			key,
			optionId,
			optionName: getLocalizedValue(
				productOptionsById.get(optionId ?? 0)?.name
			),
			value,
		})
	);
}

export default getSKUOptionRows;
