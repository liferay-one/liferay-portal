/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {isComplete} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/accountFindingUtils';

import {getOrphanedEntitlementDefinitions} from './productCatalogUtils';

import type {Word} from '~/i18n';
import type {InspectedEntry} from '~/types/accountInspection';
import type {Catalog} from '~/types/commerce';
import type {Specification} from '~/types/product';
import type {
	InspectedEntitlementDefinition,
	InspectedEntitlementDefinitionSKU,
	InspectedProduct,
	ProductCatalogInspection,
} from '~/types/productInspection';

import type {CatalogIndex} from './productCatalogUtils';

export type BrokenEntitlementDefinitionSKU =
	InspectedEntitlementDefinitionSKU & {reasons: Word[]};

export type UnusedSpecification = InspectedEntry & Specification & {id: number};

export type ProductOrphans = {
	catalogs: Catalog[] | null;
	duplicateEntitlementDefinitionSKUs:
		| InspectedEntitlementDefinitionSKU[]
		| null;
	entitlementDefinitionSKUs: BrokenEntitlementDefinitionSKU[] | null;
	entitlementDefinitions: InspectedEntitlementDefinition[] | null;
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

function getCatalogsWithoutProducts({
	catalogs,
	products,
}: ProductCatalogInspection) {
	if (!isComplete(catalogs) || !isComplete(products)) {
		return null;
	}

	const usedCatalogIds = new Set(
		products.items.map(({catalogId}) => catalogId)
	);

	return catalogs.items.filter(
		({id, system}) => !system && !usedCatalogIds.has(id)
	);
}

function getDuplicateEntitlementDefinitionSKUs({
	entitlementDefinitionSKUs,
}: ProductCatalogInspection) {
	if (!isComplete(entitlementDefinitionSKUs)) {
		return null;
	}

	const linkKeys = new Set<string>();

	return [...entitlementDefinitionSKUs.items]
		.sort(
			(entitlementDefinitionSKU1, entitlementDefinitionSKU2) =>
				entitlementDefinitionSKU1.id - entitlementDefinitionSKU2.id
		)
		.filter(
			({
				r_entitlementDefinitionToSku_c_entitlementDefinitionId:
					entitlementDefinitionId,
				skuExternalReferenceCode,
			}) => {
				if (!entitlementDefinitionId || !skuExternalReferenceCode) {
					return false;
				}

				const linkKey = `${entitlementDefinitionId}:${skuExternalReferenceCode}`;

				if (linkKeys.has(linkKey)) {
					return true;
				}

				linkKeys.add(linkKey);

				return false;
			}
		);
}

function getBrokenEntitlementDefinitionSKUs(
	{
		entitlementDefinitionSKUs,
		entitlementDefinitions,
	}: ProductCatalogInspection,
	{productsBySKU}: CatalogIndex,
	orphanedEntitlementDefinitions: InspectedEntitlementDefinition[] | null
) {
	if (
		!orphanedEntitlementDefinitions ||
		!productsBySKU ||
		!isComplete(entitlementDefinitionSKUs) ||
		!isComplete(entitlementDefinitions)
	) {
		return null;
	}

	const entitlementDefinitionIds = new Set(
		entitlementDefinitions.items.map(({id}) => id)
	);

	const orphanedEntitlementDefinitionIds = new Set(
		orphanedEntitlementDefinitions.map(({id}) => id)
	);

	return entitlementDefinitionSKUs.items
		.filter(
			({
				r_entitlementDefinitionToSku_c_entitlementDefinitionId:
					entitlementDefinitionId,
			}) =>
				!orphanedEntitlementDefinitionIds.has(
					entitlementDefinitionId ?? 0
				)
		)
		.map((entitlementDefinitionSKU) => {
			const reasons: Word[] = [];

			if (
				!entitlementDefinitionIds.has(
					entitlementDefinitionSKU.r_entitlementDefinitionToSku_c_entitlementDefinitionId ??
						0
				)
			) {
				reasons.push('the-entitlement-definition-does-not-exist');
			}

			if (
				!productsBySKU.has(
					entitlementDefinitionSKU.skuExternalReferenceCode ?? ''
				)
			) {
				reasons.push('the-sku-matches-no-product');
			}

			return {...entitlementDefinitionSKU, reasons};
		})
		.filter(({reasons}) => reasons.length);
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

function getProductOrphans(
	inspection: ProductCatalogInspection,
	index: CatalogIndex
): ProductOrphans {
	const entitlementDefinitions = getOrphanedEntitlementDefinitions(
		inspection.entitlementDefinitions.items,
		index
	);

	return {
		catalogs: getCatalogsWithoutProducts(inspection),
		duplicateEntitlementDefinitionSKUs:
			getDuplicateEntitlementDefinitionSKUs(inspection),
		entitlementDefinitionSKUs: getBrokenEntitlementDefinitionSKUs(
			inspection,
			index,
			entitlementDefinitions
		),
		entitlementDefinitions,
		specifications: getUnusedSpecifications(inspection),
		usageDefinitions: getUnusedUsageDefinitions(inspection),
	};
}

export default getProductOrphans;
