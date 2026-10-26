/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {Word} from '~/i18n';
import type {
	AccountFindingSeverity,
	InspectedCollection,
	InspectedEntry,
} from '~/types/accountInspection';
import type {Catalog} from '~/types/commerce';
import type {Product, Specification} from '~/types/product';

export const PRODUCT_NESTED_COLLECTION_KEYS = [
	'categories',
	'productOptions',
	'productSpecifications',
	'skus',
] as const;

export type ProductNestedCollectionKey =
	(typeof PRODUCT_NESTED_COLLECTION_KEYS)[number];

export type InspectedSKU = InspectedEntry & {
	discontinued?: boolean;
	price?: number;
	productId?: number;
	published?: boolean;
	purchasable?: boolean;
	sku?: string;
	skuOptions?: {key: string; value: string}[];
};

export type InspectedProduct = Omit<Product, 'skus'> & {
	incompleteCollections: ProductNestedCollectionKey[];
	skus: InspectedSKU[];
};

export type InspectedEntitlementDefinition = InspectedEntry & {
	active?: boolean;
	defaultQuantity?: number;
	displayName?: string;
	generatesActivationKey?: boolean;
	grantType?: string;
	licenseKeyDurationDays?: number;
	licenseKeyFamily?: string;
	licenseKeyType?: string;
	maxQuantity?: number;
	name?: string;
	overageRate?: number;
	overageSkuExternalReferenceCode?: string;
	productOptions?: string;
	r_usageDefinitionToEntitlementDefinition_c_usageDefinitionId?: number;
	skuExternalReferenceCodes: string[];
	unit?: string;
};

export type InspectedEntitlementDefinitionSKU = InspectedEntry & {
	r_entitlementDefinitionToSku_c_entitlementDefinitionId?: number;
	skuExternalReferenceCode?: string;
};

export type ProductCatalogInspection = {
	catalogs: InspectedCollection<Catalog>;
	entitlementDefinitionSKUs: InspectedCollection<InspectedEntitlementDefinitionSKU>;
	entitlementDefinitions: InspectedCollection<InspectedEntitlementDefinition>;
	loadedAt: number;
	products: InspectedCollection<InspectedProduct>;
	specifications: InspectedCollection<Specification>;
	usageDefinitions: InspectedCollection;
};

export type ProductCollectionKey =
	| 'entitlementDefinitions'
	| 'product'
	| ProductNestedCollectionKey;

export type EntitlementDefinitionCollectionKey =
	| 'entitlementDefinition'
	| 'entitlements'
	| 'skus'
	| 'usageDefinition';

export type InspectorFinding<CollectionKey extends string = string> = {
	collection: CollectionKey;
	ids: (number | string)[];
	message: Word;
	severity: AccountFindingSeverity;
};
