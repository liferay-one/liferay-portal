/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Link} from 'react-router';
import i18n from '~/i18n';
import InspectorTable from '~/pages/Admin/components/InspectorTable/InspectorTable';

import {
	getLocalizedValue,
	getProductName,
} from '../../utils/productCatalogUtils';
import {
	getEntitlementDefinitionColumns,
	getEntitlementDefinitionPath,
	getProductPath,
} from '../../utils/productInspectorColumnsUtils';

import type {Word} from '~/i18n';
import type {InspectorTableColumn} from '~/pages/Admin/components/InspectorTable/InspectorTable';
import type {InspectedEntry} from '~/types/accountInspection';
import type {
	InspectedEntitlementDefinitionSKU,
	InspectorFinding,
} from '~/types/productInspection';

import type {
	OrphanedSKU,
	ProductOrphans as ProductOrphanLists,
	UnusedSpecification,
} from '../../utils/getProductOrphans';
import type {CatalogIndex} from '../../utils/productCatalogUtils';

const ENTITLEMENT_DEFINITION_SKU_COLUMNS: InspectorTableColumn<InspectedEntitlementDefinitionSKU>[] =
	[
		{label: 'id', sortable: true, value: ({id}) => id},
		{
			label: 'sku',
			sortable: true,
			value: ({skuExternalReferenceCode}) => skuExternalReferenceCode,
		},
		{
			label: 'entitlement-definition',
			render: (entitlementDefinitionSKU) => {
				const entitlementDefinitionId =
					entitlementDefinitionSKU.r_entitlementDefinitionToSku_c_entitlementDefinitionId;
				const externalReferenceCode = String(
					entitlementDefinitionSKU.r_entitlementDefinitionToSku_c_entitlementDefinitionERC ||
						'-'
				);

				return entitlementDefinitionId ? (
					<Link
						to={getEntitlementDefinitionPath(
							entitlementDefinitionId
						)}
					>
						{externalReferenceCode}
					</Link>
				) : (
					externalReferenceCode
				);
			},
			sortable: true,
			value: (entitlementDefinitionSKU) =>
				entitlementDefinitionSKU.r_entitlementDefinitionToSku_c_entitlementDefinitionERC,
		},
		{
			label: 'external-reference-code',
			sortable: true,
			value: ({externalReferenceCode}) => externalReferenceCode,
		},
	];

const SKU_COLUMNS: InspectorTableColumn<OrphanedSKU>[] = [
	{label: 'sku', sortable: true, value: ({sku}) => sku},
	{
		label: 'product',
		render: ({product}) => (
			<Link to={getProductPath(product.id)}>
				{getProductName(product)}
			</Link>
		),
		sortable: true,
		value: ({product}) => getProductName(product),
	},
	{
		hidden: true,
		label: 'external-reference-code',
		sortable: true,
		value: ({externalReferenceCode}) => externalReferenceCode,
	},
	{label: 'published', sortable: true, value: ({published}) => published},
	{
		label: 'purchasable',
		sortable: true,
		value: ({purchasable}) => purchasable,
	},
	{label: 'id', sortable: true, value: ({id}) => id},
];

const SPECIFICATION_COLUMNS: InspectorTableColumn<UnusedSpecification>[] = [
	{label: 'key', sortable: true, value: ({key}) => key},
	{
		label: 'title',
		sortable: true,
		value: ({title}) => getLocalizedValue(title),
	},
	{
		label: 'category',
		sortable: true,
		value: ({optionCategory}) => getLocalizedValue(optionCategory?.title),
	},
	{label: 'id', sortable: true, value: ({id}) => id},
];

const USAGE_DEFINITION_COLUMNS: InspectorTableColumn<InspectedEntry>[] = [
	{label: 'id', sortable: true, value: ({id}) => id},
	{
		label: 'external-reference-code',
		sortable: true,
		value: ({externalReferenceCode}) => externalReferenceCode,
	},
	{label: 'unit', sortable: true, value: ({unit}) => unit},
	{
		label: 'usage-source',
		sortable: true,
		value: ({usageSource}) => usageSource,
	},
	{label: 'period', sortable: true, value: ({period}) => period},
];

type ProductOrphansProps = {
	entitlementDefinitionFindings: Map<number, InspectorFinding[]>;
	index: CatalogIndex;
	orphans: ProductOrphanLists;
};

function getListProps<Entry>(entries: Entry[] | null) {
	return entries
		? {entries}
		: {
				entries: [],
				error: i18n.translate(
					'this-list-could-not-be-checked-because-its-records-did-not-load-completely'
				),
			};
}

export default function ProductOrphans({
	entitlementDefinitionFindings,
	index,
	orphans,
}: ProductOrphansProps) {
	const title = (label: Word) => i18n.translate(label);

	return (
		<>
			<h3 className="mb-3 mt-4">{i18n.translate('orphans')}</h3>

			<InspectorTable
				columns={getEntitlementDefinitionColumns(
					entitlementDefinitionFindings,
					index,
					undefined,
					false
				)}
				id="product-inspector-orphaned-entitlement-definitions"
				title={title('entitlement-definitions-without-a-product')}
				{...getListProps(orphans.entitlementDefinitions)}
			/>

			<InspectorTable
				columns={ENTITLEMENT_DEFINITION_SKU_COLUMNS}
				id="product-inspector-orphaned-entitlement-definition-skus"
				title={title('entitlement-definition-skus-without-a-match')}
				{...getListProps(orphans.entitlementDefinitionSKUs)}
			/>

			<InspectorTable
				columns={SKU_COLUMNS}
				id="product-inspector-orphaned-skus"
				title={title('skus-without-entitlement-definitions')}
				{...getListProps(orphans.skus)}
			/>

			<InspectorTable
				columns={USAGE_DEFINITION_COLUMNS}
				id="product-inspector-orphaned-usage-definitions"
				title={title('unused-usage-definitions')}
				{...getListProps(orphans.usageDefinitions)}
			/>

			<InspectorTable
				columns={SPECIFICATION_COLUMNS}
				id="product-inspector-orphaned-specifications"
				title={title('unused-specifications')}
				{...getListProps(orphans.specifications)}
			/>
		</>
	);
}
