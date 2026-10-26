/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {isComplete} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/accountFindingUtils';

import {getOrphanedEntitlementDefinitions} from './productCatalogUtils';

import type {InspectedEntry} from '~/types/accountInspection';
import type {Specification} from '~/types/product';
import type {
	InspectedEntitlementDefinition,
	InspectedEntitlementDefinitionSKU,
	InspectedProduct,
	ProductCatalogInspection,
} from '~/types/productInspection';

import type {CatalogIndex} from './productCatalogUtils';

export type UnusedSpecification = InspectedEntry & Specification & {id: number};

export type ProductOrphans = {
	entitlementDefinitionSKUs: InspectedEntitlementDefinitionSKU[] | null;
	entitlementDefinitions: InspectedEntitlementDefinition[] | null;
	products: InspectedProduct[] | null;
	specifications: UnusedSpecification[] | null;
	usageDefinitions: InspectedEntry[] | null;
};

function areProductCollectionsComplete(
	{products}: ProductCatalogInspection,
	key: InspectedProduct['incompleteCollections'][number]
) {
	return (
		isComplete(products) &&
		products.items.every(
			({incompleteCollections}) => !incompleteCollections.includes(key)
		)
	);
}

function getOrphanedEntitlementDefinitionSKUs(
	{
		entitlementDefinitionSKUs,
		entitlementDefinitions,
	}: ProductCatalogInspection,
	{productsBySKU}: CatalogIndex
) {
	if (
		!productsBySKU ||
		!isComplete(entitlementDefinitionSKUs) ||
		!isComplete(entitlementDefinitions)
	) {
		return null;
	}

	const entitlementDefinitionIds = new Set(
		entitlementDefinitions.items.map(({id}) => id)
	);

	return entitlementDefinitionSKUs.items.filter(
		({
			r_entitlementDefinitionToSku_c_entitlementDefinitionId:
				entitlementDefinitionId,
			skuExternalReferenceCode,
		}) =>
			!entitlementDefinitionIds.has(entitlementDefinitionId ?? 0) ||
			!productsBySKU.has(skuExternalReferenceCode ?? '')
	);
}

function getUnusedUsageDefinitions({
	entitlementDefinitions,
	usageDefinitions,
}: ProductCatalogInspection) {
	if (!isComplete(entitlementDefinitions) || !isComplete(usageDefinitions)) {
		return null;
	}

	const usedIds = new Set(
		entitlementDefinitions.items.map(
			(entitlementDefinition) =>
				entitlementDefinition.r_usageDefinitionToEntitlementDefinition_c_usageDefinitionId
		)
	);

	return usageDefinitions.items.filter(({id}) => !usedIds.has(id));
}

function getUnusedSpecifications(inspection: ProductCatalogInspection) {
	const {products, specifications} = inspection;

	if (
		!isComplete(specifications) ||
		!areProductCollectionsComplete(inspection, 'productSpecifications')
	) {
		return null;
	}

	const usedKeys = new Set(
		products.items.flatMap(({productSpecifications}) =>
			(productSpecifications ?? []).map(
				({specificationKey}) => specificationKey
			)
		)
	);

	return specifications.items.filter(
		(specification): specification is UnusedSpecification =>
			specification.id !== undefined &&
			!usedKeys.has(specification.key ?? '')
	);
}

function getProductsWithoutEntitlementDefinitions(
	inspection: ProductCatalogInspection,
	{entitlementDefinitionsBySKU}: CatalogIndex
) {
	if (
		!entitlementDefinitionsBySKU ||
		!areProductCollectionsComplete(inspection, 'skus')
	) {
		return null;
	}

	return inspection.products.items.filter(
		({skus}) =>
			!(skus ?? []).some(({externalReferenceCode}) =>
				entitlementDefinitionsBySKU.has(externalReferenceCode ?? '')
			)
	);
}

function getProductOrphans(
	inspection: ProductCatalogInspection,
	index: CatalogIndex
): ProductOrphans {
	return {
		entitlementDefinitionSKUs: getOrphanedEntitlementDefinitionSKUs(
			inspection,
			index
		),
		entitlementDefinitions: getOrphanedEntitlementDefinitions(
			inspection.entitlementDefinitions.items,
			index
		),
		products: getProductsWithoutEntitlementDefinitions(inspection, index),
		specifications: getUnusedSpecifications(inspection),
		usageDefinitions: getUnusedUsageDefinitions(inspection),
	};
}

export default getProductOrphans;
