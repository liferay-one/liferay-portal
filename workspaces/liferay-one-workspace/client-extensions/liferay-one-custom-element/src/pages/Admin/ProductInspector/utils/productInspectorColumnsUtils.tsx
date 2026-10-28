/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Link} from 'react-router';
import {formatDate} from '~/utils/dateUtils';

import FindingsLabel from '../components/FindingsLabel/FindingsLabel';
import {
	PROJECT_ITEM_TYPE_SPECIFICATION_KEY,
	getEntitlementDefinitions,
	getLocalizedValue,
	getProductName,
	getSpecificationValue,
} from './productCatalogUtils';

import type {InspectorTableColumn} from '~/pages/Admin/components/InspectorTable/InspectorTable';
import type {
	InspectedEntitlementDefinition,
	InspectedProduct,
	InspectorFinding,
} from '~/types/productInspection';

import type {CatalogIndex} from './productCatalogUtils';

export function getProductPath(externalReferenceCode = '') {
	return `/product-inspector/${encodeURIComponent(externalReferenceCode)}`;
}

export function getSKUPath(
	productExternalReferenceCode = '',
	skuExternalReferenceCode = '',
	section?: string
) {
	const path = `${getProductPath(productExternalReferenceCode)}/skus/${encodeURIComponent(skuExternalReferenceCode)}`;

	return section ? `${path}?${new URLSearchParams({section})}` : path;
}

export function getEntitlementDefinitionPath(
	externalReferenceCode = '',
	productExternalReferenceCode?: string
) {
	const path = `/product-inspector/entitlement-definitions/${encodeURIComponent(externalReferenceCode)}`;

	return productExternalReferenceCode
		? `${path}?${new URLSearchParams({productExternalReferenceCode})}`
		: path;
}

export function getEntitlementDefinitionName({
	displayName,
	externalReferenceCode,
	name,
}: InspectedEntitlementDefinition) {
	return displayName || name || externalReferenceCode || '';
}

export function getProductColumns(
	catalogNames: Map<number, string>,
	findings: Map<number, InspectorFinding[]>,
	index: CatalogIndex
): InspectorTableColumn<InspectedProduct>[] {
	return [
		{
			label: 'name',
			render: (product) => (
				<Link to={getProductPath(product.externalReferenceCode)}>
					<b>{getProductName(product)}</b>
				</Link>
			),
			sortable: true,
			value: getProductName,
		},
		{label: 'id', sortable: true, value: ({id}) => id},
		{
			hidden: true,
			label: 'external-reference-code',
			sortable: true,
			value: ({externalReferenceCode}) => externalReferenceCode,
		},
		{
			hidden: true,
			label: 'catalog',
			sortable: true,
			value: ({catalogId}) => catalogNames.get(catalogId) ?? catalogId,
		},
		{
			label: 'status',
			sortable: true,
			value: ({workflowStatusInfo}) =>
				workflowStatusInfo?.label_i18n ?? workflowStatusInfo?.label,
		},
		{
			label: 'project-item-type',
			sortable: true,
			value: (product) =>
				getSpecificationValue(
					product,
					PROJECT_ITEM_TYPE_SPECIFICATION_KEY
				),
		},
		{
			hidden: true,
			label: 'product-type',
			sortable: true,
			value: ({productType}) => productType,
		},
		{label: 'skus', sortable: true, value: ({skus}) => skus?.length ?? 0},
		{
			label: 'specifications',
			sortable: true,
			value: ({productSpecifications}) =>
				productSpecifications?.length ?? 0,
		},
		{
			label: 'entitlement-definitions',
			sortable: true,
			value: (product) =>
				index.entitlementDefinitionsBySKU
					? getEntitlementDefinitions(product, index).length
					: undefined,
		},
		{
			label: 'findings',
			render: ({id}) => (
				<FindingsLabel findings={findings.get(id) ?? []} />
			),
			sortable: true,
			value: ({id}) => findings.get(id)?.length ?? 0,
		},
		{
			hidden: true,
			label: 'sku-codes',
			value: ({skus}) =>
				(skus ?? []).map(
					({externalReferenceCode, sku}) =>
						externalReferenceCode ?? sku
				),
		},
		{
			hidden: true,
			label: 'specification-values',
			value: ({productSpecifications}) =>
				(productSpecifications ?? []).map(
					({specificationKey, value}) =>
						`${specificationKey}: ${getLocalizedValue(value)}`
				),
		},
		{
			hidden: true,
			label: 'modified-date',
			render: ({modifiedDate}) => formatDate(modifiedDate),
			sortable: true,
			value: ({modifiedDate}) => modifiedDate,
		},
	];
}

export function getEntitlementDefinitionColumns(
	findings: Map<number, InspectorFinding[]>,
	index: CatalogIndex,
	{
		linked = true,
		productExternalReferenceCode,
		productsVisible = !productExternalReferenceCode,
	}: {
		linked?: boolean;
		productExternalReferenceCode?: string;
		productsVisible?: boolean;
	} = {}
): InspectorTableColumn<InspectedEntitlementDefinition>[] {
	return [
		{
			label: 'display-name',
			render: (entitlementDefinition) =>
				linked ? (
					<Link
						to={getEntitlementDefinitionPath(
							entitlementDefinition.externalReferenceCode,
							productExternalReferenceCode
						)}
					>
						<b>
							{getEntitlementDefinitionName(
								entitlementDefinition
							)}
						</b>
					</Link>
				) : (
					<b>{getEntitlementDefinitionName(entitlementDefinition)}</b>
				),
			sortable: true,
			value: getEntitlementDefinitionName,
		},
		{label: 'name', sortable: true, value: ({name}) => name},
		{label: 'id', sortable: true, value: ({id}) => id},
		{
			hidden: true,
			label: 'external-reference-code',
			sortable: true,
			value: ({externalReferenceCode}) => externalReferenceCode,
		},
		{
			label: 'sku-codes',
			value: ({skuExternalReferenceCodes}) => skuExternalReferenceCodes,
		},
		{
			hidden: !productsVisible,
			label: 'products',
			value: ({skuExternalReferenceCodes}) => [
				...new Set(
					skuExternalReferenceCodes.flatMap(
						(skuExternalReferenceCode) =>
							(
								index.productsBySKU?.get(
									skuExternalReferenceCode
								) ?? []
							).map(getProductName)
					)
				),
			],
		},
		{
			label: 'grant-type',
			sortable: true,
			value: ({grantType}) => grantType,
		},
		{label: 'unit', sortable: true, value: ({unit}) => unit},
		{
			hidden: true,
			label: 'default-quantity',
			sortable: true,
			value: ({defaultQuantity}) => defaultQuantity,
		},
		{
			hidden: true,
			label: 'max-quantity',
			sortable: true,
			value: ({maxQuantity}) => maxQuantity,
		},
		{
			label: 'license-key-family',
			sortable: true,
			value: ({licenseKeyFamily}) => licenseKeyFamily,
		},
		{label: 'active', sortable: true, value: ({active}) => active},
		{
			label: 'findings',
			render: ({id}) => (
				<FindingsLabel findings={findings.get(id) ?? []} />
			),
			sortable: true,
			value: ({id}) => findings.get(id)?.length ?? 0,
		},
	];
}
