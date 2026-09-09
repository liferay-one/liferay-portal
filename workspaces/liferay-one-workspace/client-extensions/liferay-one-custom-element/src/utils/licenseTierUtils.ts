/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ProductLicense, ProductLicenseTier} from '~/enums/Product';
import {Word} from '~/i18n';

import type {DeliveryProduct, DeliverySKU} from '~/types/product';

const LICENSE_USAGE_TYPE_SKU_OPTION_KEYS: readonly string[] = [
	ProductLicense.BASE,
	ProductLicense.CLOUD,
	ProductLicense.CMP,
	ProductLicense.DXP,
];

export const PRODUCT_LICENSE_TIER_ORDER: readonly ProductLicenseTier[] = [
	ProductLicenseTier.DEVELOPER,
	ProductLicenseTier.TRIAL,
	ProductLicenseTier.PRODUCTION,
	ProductLicenseTier.STANDARD,
];

export const ProductLicenseTierLabels: Record<ProductLicenseTier, Word> = {
	[ProductLicenseTier.DEVELOPER]: 'developer',
	[ProductLicenseTier.PRODUCTION]: 'production',
	[ProductLicenseTier.STANDARD]: 'standard',
	[ProductLicenseTier.TRIAL]: 'trial',
};

export type LicenseTierSKU = {
	sku: DeliverySKU;
	tier: ProductLicenseTier;
};

export function isProductLicenseTier(
	value: string
): value is ProductLicenseTier {
	return (PRODUCT_LICENSE_TIER_ORDER as readonly string[]).includes(value);
}

export function getSKULicenseTier(
	sku: DeliverySKU
): ProductLicenseTier | undefined {
	const skuOption = (sku.skuOptions ?? []).find(
		({skuOptionKey, skuOptionValueKey}) =>
			LICENSE_USAGE_TYPE_SKU_OPTION_KEYS.includes(skuOptionKey) &&
			isProductLicenseTier(skuOptionValueKey)
	);

	return skuOption?.skuOptionValueKey as ProductLicenseTier | undefined;
}

export function getLicenseTierSKUs(product: DeliveryProduct): LicenseTierSKU[] {
	const licenseTierSKUs: LicenseTierSKU[] = [];

	for (const sku of product.skus ?? []) {
		const tier = sku.purchasable ? getSKULicenseTier(sku) : undefined;

		if (tier) {
			licenseTierSKUs.push({sku, tier});
		}
	}

	return licenseTierSKUs.sort(
		(firstSKU, secondSKU) =>
			PRODUCT_LICENSE_TIER_ORDER.indexOf(firstSKU.tier) -
			PRODUCT_LICENSE_TIER_ORDER.indexOf(secondSKU.tier)
	);
}

export function getLicenseTierSKU(
	product: DeliveryProduct,
	tier: ProductLicenseTier
): DeliverySKU | undefined {
	return getLicenseTierSKUs(product).find(
		(licenseTierSKU) => licenseTierSKU.tier === tier
	)?.sku;
}

export function getProductLicenseTiers(
	product: DeliveryProduct
): ProductLicenseTier[] {
	return getLicenseTierSKUs(product).map(({tier}) => tier);
}
