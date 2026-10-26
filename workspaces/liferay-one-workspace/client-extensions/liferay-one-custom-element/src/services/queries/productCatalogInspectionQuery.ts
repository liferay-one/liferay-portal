/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import fetchInspectedCollection from '~/services/fetcher/fetchInspectedCollection';
import {PRODUCT_NESTED_COLLECTION_KEYS} from '~/types/productInspection';

import type {
	InspectedCollection,
	InspectedEntry,
} from '~/types/accountInspection';
import type {DataQuery} from '~/types/api';
import type {Catalog} from '~/types/commerce';
import type {Product, Specification} from '~/types/product';
import type {
	InspectedEntitlementDefinition,
	InspectedEntitlementDefinitionSKU,
	InspectedProduct,
	ProductCatalogInspection,
	ProductNestedCollectionKey,
} from '~/types/productInspection';

const CATALOG_PATH = '/o/headless-commerce-admin-catalog/v1.0';

const NESTED_PAGE_SIZE = 20;

const PRODUCT_PAGE_SIZE = 100;

async function getNestedCollection(
	product: Product,
	key: ProductNestedCollectionKey
) {
	const items = (product[key] ?? []) as unknown[];

	if (items.length < NESTED_PAGE_SIZE) {
		return {complete: true, items};
	}

	const collection = await fetchInspectedCollection(
		`${CATALOG_PATH}/products/${product.productId}/${key}`
	);

	if (collection.error) {
		return {complete: false, items};
	}

	return {complete: !collection.truncated, items: collection.items};
}

async function toInspectedProduct(product: Product): Promise<InspectedProduct> {
	const nestedCollections = await Promise.all(
		PRODUCT_NESTED_COLLECTION_KEYS.map(
			async (key) =>
				[key, await getNestedCollection(product, key)] as const
		)
	);

	return {
		...product,
		...Object.fromEntries(
			nestedCollections.map(([key, {items}]) => [key, items])
		),
		incompleteCollections: nestedCollections
			.filter(([, {complete}]) => !complete)
			.map(([key]) => key),
	} as InspectedProduct;
}

async function getProducts(): Promise<InspectedCollection<InspectedProduct>> {
	const products = await fetchInspectedCollection<Product>(
		`${CATALOG_PATH}/products`,
		{nestedFields: PRODUCT_NESTED_COLLECTION_KEYS.join(',')},
		PRODUCT_PAGE_SIZE
	);

	return {
		...products,
		items: await Promise.all(products.items.map(toInspectedProduct)),
	};
}

async function getEntitlementDefinitions(): Promise<
	Pick<
		ProductCatalogInspection,
		'entitlementDefinitionSKUs' | 'entitlementDefinitions'
	>
> {
	const [entitlementDefinitions, entitlementDefinitionSKUs] =
		await Promise.all([
			fetchInspectedCollection<InspectedEntitlementDefinition>(
				'/o/c/entitlementdefinitions'
			),
			fetchInspectedCollection<InspectedEntitlementDefinitionSKU>(
				'/o/c/entitlementdefinitionskus'
			),
		]);

	const skuExternalReferenceCodes = new Map<number, string[]>();

	for (const entitlementDefinitionSKU of entitlementDefinitionSKUs.items) {
		const entitlementDefinitionId =
			entitlementDefinitionSKU.r_entitlementDefinitionToSku_c_entitlementDefinitionId;

		if (
			!entitlementDefinitionId ||
			!entitlementDefinitionSKU.skuExternalReferenceCode
		) {
			continue;
		}

		skuExternalReferenceCodes.set(entitlementDefinitionId, [
			...(skuExternalReferenceCodes.get(entitlementDefinitionId) ?? []),
			entitlementDefinitionSKU.skuExternalReferenceCode,
		]);
	}

	return {
		entitlementDefinitionSKUs,
		entitlementDefinitions: {
			error:
				entitlementDefinitions.error ?? entitlementDefinitionSKUs.error,
			items: entitlementDefinitions.items.map(
				(entitlementDefinition) => ({
					...entitlementDefinition,
					skuExternalReferenceCodes:
						skuExternalReferenceCodes.get(
							entitlementDefinition.id
						) ?? [],
				})
			),
			totalCount: entitlementDefinitions.totalCount,
			truncated:
				entitlementDefinitions.truncated ||
				entitlementDefinitionSKUs.truncated,
		},
	};
}

async function getProductCatalogInspection(): Promise<ProductCatalogInspection> {
	const [
		catalogs,
		{entitlementDefinitionSKUs, entitlementDefinitions},
		products,
		specifications,
		usageDefinitions,
	] = await Promise.all([
		fetchInspectedCollection<Catalog>(`${CATALOG_PATH}/catalogs`),
		getEntitlementDefinitions(),
		getProducts(),
		fetchInspectedCollection<Specification>(
			`${CATALOG_PATH}/specifications`
		),
		fetchInspectedCollection<InspectedEntry>('/o/c/usagedefinitions'),
	]);

	return {
		catalogs,
		entitlementDefinitionSKUs,
		entitlementDefinitions,
		loadedAt: Date.now(),
		products,
		specifications,
		usageDefinitions,
	};
}

export function productCatalogInspectionQuery(): DataQuery<ProductCatalogInspection> {
	return {
		fetcher: getProductCatalogInspection,
		key: '/product-catalog-inspection',
	};
}
