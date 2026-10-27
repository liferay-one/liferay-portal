/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/i18n';
import {
	buildSeverityIndex,
	getWorstSeverity,
	toSeverityKey,
} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/accountTreeNodeUtils';
import {
	PRODUCT_COLLECTION_LABELS,
	getEntitlementDefinitions,
	getProductName,
	isProblem,
} from '~/pages/Admin/ProductInspector/utils/productCatalogUtils';
import {getEntitlementDefinitionName} from '~/pages/Admin/ProductInspector/utils/productInspectorColumnsUtils';

import {getOptionRows, getSpecificationRows} from './productDetailColumnsUtils';

import type {SeverityIndex} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/accountTreeNodeUtils';
import type {CatalogIndex} from '~/pages/Admin/ProductInspector/utils/productCatalogUtils';
import type {
	AccountFindingSeverity,
	InspectorTreeNode,
} from '~/types/accountInspection';
import type {
	InspectedEntitlementDefinition,
	InspectedProduct,
	InspectorFinding,
	ProductCatalogInspection,
	ProductCollectionKey,
} from '~/types/productInspection';

type ProductTreeNode = InspectorTreeNode<ProductCollectionKey>;

type ProductTreeRecord = {
	id: number;
	label: string;
	meta?: string;
	severity?: AccountFindingSeverity;
};

export type ProductTreeContext = {
	entitlementDefinitionFindings: Map<number, InspectorFinding[]>;
	findings: InspectorFinding<ProductCollectionKey>[];
	index: CatalogIndex;
	inspection: ProductCatalogInspection;
};

function toMeta(id: number) {
	return id > 0 ? `#${id}` : undefined;
}

function toRecordNode(
	parentKey: string,
	collection: ProductCollectionKey,
	{id, label, meta = toMeta(id), severity}: ProductTreeRecord,
	severityIndex: SeverityIndex,
	children: ProductTreeNode[] = []
): ProductTreeNode {
	return {
		children,
		collection,
		key: `${parentKey}/${toSeverityKey(collection, id)}`,
		label: label || `#${id}`,
		meta,
		recordId: id,
		severity: getWorstSeverity([
			severity,
			severityIndex.get(toSeverityKey(collection, id)),
			...children.map((child) => child.severity),
		]),
	};
}

function toGroupNode(
	parentKey: string,
	collection: ProductCollectionKey,
	records: ProductTreeRecord[],
	severityIndex: SeverityIndex,
	getChildren?: (
		record: ProductTreeRecord,
		recordKey: string
	) => ProductTreeNode[]
): ProductTreeNode[] {
	if (!records.length) {
		return [];
	}

	const groupKey = `${parentKey}/${collection}`;

	const children = records.map((record) =>
		toRecordNode(
			groupKey,
			collection,
			record,
			severityIndex,
			getChildren?.(
				record,
				`${groupKey}/${toSeverityKey(collection, record.id)}`
			)
		)
	);

	return [
		{
			children,
			collection,
			count: records.length,
			key: groupKey,
			label: i18n.translate(PRODUCT_COLLECTION_LABELS[collection]),
			severity: getWorstSeverity(children.map(({severity}) => severity)),
		},
	];
}

function toLeafNode(key: string, label: string): ProductTreeNode {
	return {children: [], key, label};
}

function getRecordsByCollection(
	product: InspectedProduct,
	{entitlementDefinitionFindings, index, inspection}: ProductTreeContext
) {
	return new Map<ProductCollectionKey, ProductTreeRecord[]>([
		[
			'productSpecifications',
			getSpecificationRows(product, inspection.specifications.items).map(
				({id, specificationKey, value}) => ({
					id,
					label: `${specificationKey}: ${value}`,
				})
			),
		],
		[
			'skus',
			(product.skus ?? []).map(({externalReferenceCode, id, sku}) => ({
				id,
				label: sku || externalReferenceCode || '',
			})),
		],
		[
			'entitlementDefinitions',
			getEntitlementDefinitions(product, index).map(
				(entitlementDefinition) => ({
					id: entitlementDefinition.id,
					label: getEntitlementDefinitionName(entitlementDefinition),
					severity: getWorstSeverity(
						(
							entitlementDefinitionFindings.get(
								entitlementDefinition.id
							) ?? []
						)
							.filter(isProblem)
							.map(({severity}) => severity)
					),
				})
			),
		],
		[
			'productOptions',
			getOptionRows(product).map(({id, key, name}) => ({
				id,
				label: name || key || '',
			})),
		],
		[
			'categories',
			(product.categories ?? []).map(({id, name, vocabulary}) => ({
				id,
				label: name,
				meta: vocabulary,
			})),
		],
	]);
}

function getUsageDefinitionNodes(
	entitlementDefinition: InspectedEntitlementDefinition,
	entitlementDefinitionKey: string,
	inspection: ProductCatalogInspection
): ProductTreeNode[] {
	const usageDefinitionId =
		entitlementDefinition.r_usageDefinitionToEntitlementDefinition_c_usageDefinitionId;

	if (!usageDefinitionId) {
		return [];
	}

	const usageDefinition = inspection.usageDefinitions.items.find(
		({id}) => id === usageDefinitionId
	);

	return [
		toLeafNode(
			`${entitlementDefinitionKey}/usageDefinition`,
			`${i18n.translate('usage-definition')}: ${String(
				usageDefinition?.name ||
					usageDefinition?.externalReferenceCode ||
					`#${usageDefinitionId}`
			)}`
		),
	];
}

function buildSKUChildren(
	product: InspectedProduct,
	skuExternalReferenceCode: string | undefined,
	skuKey: string,
	entitlementDefinitionRecords: ProductTreeRecord[],
	severityIndex: SeverityIndex,
	{index, inspection}: ProductTreeContext
): ProductTreeNode[] {
	const entitlementDefinitions =
		index.entitlementDefinitionsBySKU?.get(
			skuExternalReferenceCode ?? ''
		) ?? [];

	const entitlementDefinitionsById = new Map(
		entitlementDefinitions.map((entitlementDefinition) => [
			entitlementDefinition.id,
			entitlementDefinition,
		])
	);

	const otherProducts = (
		index.productsBySKU?.get(skuExternalReferenceCode ?? '') ?? []
	).filter(({id}) => id !== product.id);

	const productsKey = `${skuKey}/products`;

	return [
		...toGroupNode(
			skuKey,
			'entitlementDefinitions',
			entitlementDefinitionRecords.filter(({id}) =>
				entitlementDefinitionsById.has(id)
			),
			severityIndex,
			({id}, entitlementDefinitionKey) =>
				getUsageDefinitionNodes(
					entitlementDefinitionsById.get(id)!,
					entitlementDefinitionKey,
					inspection
				)
		),
		...(otherProducts.length
			? [
					{
						children: otherProducts.map((otherProduct) =>
							toLeafNode(
								`${productsKey}/${otherProduct.id}`,
								getProductName(otherProduct)
							)
						),
						count: otherProducts.length,
						key: productsKey,
						label: i18n.translate('products'),
					},
				]
			: []),
	];
}

function buildBrokenLinksNode(
	findings: InspectorFinding<ProductCollectionKey>[],
	recordsByCollection: Map<ProductCollectionKey, ProductTreeRecord[]>,
	severityIndex: SeverityIndex
): ProductTreeNode[] {
	const children = findings
		.filter(
			(finding) =>
				finding.collection !== 'product' &&
				finding.ids.length &&
				isProblem(finding)
		)
		.map(({collection, ids, message, severity}) => {
			const findingKey = `broken/${collection}/${message}`;
			const flaggedIds = new Set(ids);

			return {
				children: (recordsByCollection.get(collection) ?? [])
					.filter(({id}) => flaggedIds.has(id))
					.map((record) =>
						toRecordNode(
							findingKey,
							collection,
							record,
							severityIndex
						)
					),
				collection,
				count: ids.length,
				key: findingKey,
				label: `${i18n.translate(
					PRODUCT_COLLECTION_LABELS[collection]
				)}: ${i18n.translate(message)}`,
				severity,
			};
		});

	if (!children.length) {
		return [];
	}

	return [
		{
			children,
			count: children.reduce((total, {count}) => total + count, 0),
			key: 'broken',
			label: i18n.translate('broken-links'),
			severity: getWorstSeverity(children.map(({severity}) => severity)),
		},
	];
}

function buildProductTree(
	product: InspectedProduct,
	context: ProductTreeContext
): ProductTreeNode[] {
	const severityIndex = buildSeverityIndex(context.findings);

	const recordsByCollection = getRecordsByCollection(product, context);

	const getRecords = (collection: ProductCollectionKey) =>
		recordsByCollection.get(collection) ?? [];

	const skusById = new Map((product.skus ?? []).map((sku) => [sku.id, sku]));

	return [
		...toGroupNode(
			'root',
			'productSpecifications',
			getRecords('productSpecifications'),
			severityIndex
		),
		...toGroupNode(
			'root',
			'skus',
			getRecords('skus'),
			severityIndex,
			({id}, skuKey) =>
				buildSKUChildren(
					product,
					skusById.get(id)?.externalReferenceCode,
					skuKey,
					getRecords('entitlementDefinitions'),
					severityIndex,
					context
				)
		),
		...toGroupNode(
			'root',
			'productOptions',
			getRecords('productOptions'),
			severityIndex
		),
		...toGroupNode(
			'root',
			'categories',
			getRecords('categories'),
			severityIndex
		),
		...buildBrokenLinksNode(
			context.findings,
			recordsByCollection,
			severityIndex
		),
	];
}

export default buildProductTree;
