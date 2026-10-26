/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {isComplete} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/accountFindingUtils';
import {Liferay} from '~/services/liferay/liferay';

import type {Word} from '~/i18n';
import type {AccountFindingSeverity} from '~/types/accountInspection';
import type {
	EntitlementDefinitionCollectionKey,
	InspectedEntitlementDefinition,
	InspectedProduct,
	InspectorFinding,
	ProductCatalogInspection,
	ProductCollectionKey,
} from '~/types/productInspection';

export const PRODUCT_COLLECTION_LABELS: Record<ProductCollectionKey, Word> = {
	categories: 'categories',
	entitlementDefinitions: 'entitlement-definitions',
	product: 'product',
	productOptions: 'options',
	productSpecifications: 'specifications',
	skus: 'skus',
};

export const ENTITLEMENT_DEFINITION_COLLECTION_LABELS: Record<
	EntitlementDefinitionCollectionKey,
	Word
> = {
	entitlementDefinition: 'entitlement-definition',
	entitlements: 'entitlements',
	skus: 'skus',
	usageDefinition: 'usage-definition',
};

const PRODUCT_DEFINITIONS_PORTLET_ID =
	'com_liferay_commerce_product_definitions_web_internal_portlet_CPDefinitionsPortlet';

export const PROJECT_ITEM_TYPE_SPECIFICATION_KEY = 'project-item-type';

export const WORKFLOW_STATUS_APPROVED = 0;

const SEVERITY_ORDER: AccountFindingSeverity[] = ['danger', 'warning', 'info'];

export type CatalogIndex = {
	entitlementDefinitionsBySKU: Map<
		string,
		InspectedEntitlementDefinition[]
	> | null;
	productsBySKU: Map<string, InspectedProduct[]> | null;
	specificationKeys: Set<string> | null;
	usageDefinitionIds: Set<number> | null;
};

function addToGroup<Item>(
	groups: Map<string, Item[]>,
	key: string | undefined,
	item: Item
) {
	if (!key) {
		return;
	}

	const group = groups.get(key) ?? [];

	if (!group.includes(item)) {
		group.push(item);
	}

	groups.set(key, group);
}

export function buildCatalogIndex({
	entitlementDefinitions,
	products,
	specifications,
	usageDefinitions,
}: ProductCatalogInspection): CatalogIndex {
	const entitlementDefinitionsBySKU = new Map<
		string,
		InspectedEntitlementDefinition[]
	>();

	for (const entitlementDefinition of entitlementDefinitions.items) {
		for (const skuExternalReferenceCode of entitlementDefinition.skuExternalReferenceCodes) {
			addToGroup(
				entitlementDefinitionsBySKU,
				skuExternalReferenceCode,
				entitlementDefinition
			);
		}
	}

	const productsBySKU = new Map<string, InspectedProduct[]>();

	for (const product of products.items) {
		for (const sku of product.skus ?? []) {
			addToGroup(productsBySKU, sku.externalReferenceCode, product);
		}
	}

	const productSKUsComplete =
		isComplete(products) &&
		products.items.every(
			({incompleteCollections}) => !incompleteCollections.includes('skus')
		);

	return {
		entitlementDefinitionsBySKU: isComplete(entitlementDefinitions)
			? entitlementDefinitionsBySKU
			: null,
		productsBySKU: productSKUsComplete ? productsBySKU : null,
		specificationKeys: isComplete(specifications)
			? new Set(
					specifications.items
						.map(({key}) => key)
						.filter((key): key is string => Boolean(key))
				)
			: null,
		usageDefinitionIds: isComplete(usageDefinitions)
			? new Set(usageDefinitions.items.map(({id}) => id))
			: null,
	};
}

export function getOrphanedEntitlementDefinitions(
	entitlementDefinitions: InspectedEntitlementDefinition[],
	{productsBySKU}: CatalogIndex
) {
	if (!productsBySKU) {
		return null;
	}

	return entitlementDefinitions.filter(
		({skuExternalReferenceCodes}) =>
			!skuExternalReferenceCodes.some((skuExternalReferenceCode) =>
				productsBySKU.has(skuExternalReferenceCode)
			)
	);
}

export function getEntitlementDefinitions(
	product: InspectedProduct,
	index: CatalogIndex
) {
	return [
		...new Set(
			(product.skus ?? []).flatMap(
				({externalReferenceCode}) =>
					index.entitlementDefinitionsBySKU?.get(
						externalReferenceCode ?? ''
					) ?? []
			)
		),
	];
}

export function getLocalizedValue(value?: Record<string, string>) {
	if (!value) {
		return '';
	}

	return value.en_US ?? Object.values(value)[0] ?? '';
}

export function getProductName(product: InspectedProduct) {
	return getLocalizedValue(product.name) || product.externalReferenceCode;
}

export function getSpecificationValue(
	product: InspectedProduct,
	specificationKey: string
) {
	return getLocalizedValue(
		(product.productSpecifications ?? []).find(
			(productSpecification) =>
				productSpecification.specificationKey === specificationKey
		)?.value
	);
}

export function toFinding<CollectionKey extends string>(
	collection: CollectionKey,
	ids: (number | string)[],
	message: Word,
	severity: AccountFindingSeverity
): InspectorFinding<CollectionKey>[] {
	return ids.length ? [{collection, ids, message, severity}] : [];
}

export function toCollectionFinding<CollectionKey extends string>(
	collection: CollectionKey,
	condition: boolean,
	message: Word,
	severity: AccountFindingSeverity
): InspectorFinding<CollectionKey>[] {
	return condition ? [{collection, ids: [], message, severity}] : [];
}

export function toSpecificationRowId(id: number | undefined, position: number) {
	return id ?? -(position + 1);
}

export function sortFindings<Finding extends InspectorFinding>(
	findings: Finding[]
) {
	return [...findings].sort(
		(finding1, finding2) =>
			SEVERITY_ORDER.indexOf(finding1.severity) -
			SEVERITY_ORDER.indexOf(finding2.severity)
	);
}

export function isProblem({severity}: InspectorFinding) {
	return severity !== 'info';
}

export function getFlaggedIds(findings: Map<number, InspectorFinding[]>) {
	return new Set<number | string>(
		[...findings]
			.filter(([, recordFindings]) => recordFindings.some(isProblem))
			.map(([id]) => id)
	);
}

export function getFlaggedIdsByCollection<CollectionKey extends string>(
	findings: InspectorFinding<CollectionKey>[]
) {
	const flaggedIds = new Map<CollectionKey, Set<number | string>>();

	for (const finding of findings.filter(isProblem)) {
		flaggedIds.set(
			finding.collection,
			new Set([
				...(flaggedIds.get(finding.collection) ?? []),
				...finding.ids,
			])
		);
	}

	return flaggedIds;
}

export function getProductControlPanelURL(productId: number) {
	const namespace = `_${PRODUCT_DEFINITIONS_PORTLET_ID}_`;

	return `${Liferay.ThemeDisplay.getPathContext()}/group/guest/~/control_panel/manage?${new URLSearchParams(
		{
			[`${namespace}cpDefinitionId`]: String(productId),
			[`${namespace}mvcRenderCommandName`]:
				'/cp_definitions/edit_cp_definition',
			p_p_id: PRODUCT_DEFINITIONS_PORTLET_ID,
			p_p_lifecycle: '0',
			p_p_state: 'maximized',
		}
	)}`;
}

export function scrollToSection(sectionId: string) {
	document
		.getElementById(sectionId)
		?.scrollIntoView({behavior: 'smooth', block: 'center'});
}

export function getWorstSeverity(findings: InspectorFinding[]) {
	return SEVERITY_ORDER.find((severity) =>
		findings.some((finding) => finding.severity === severity)
	);
}
