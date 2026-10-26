/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Fragment} from 'react';
import {Link} from 'react-router';
import {
	getLocalizedValue,
	toSpecificationRowId,
} from '~/pages/Admin/ProductInspector/utils/productCatalogUtils';
import {
	getEntitlementDefinitionName,
	getEntitlementDefinitionPath,
} from '~/pages/Admin/ProductInspector/utils/productInspectorColumnsUtils';

import type {CatalogIndex} from '~/pages/Admin/ProductInspector/utils/productCatalogUtils';
import type {InspectorTableColumn} from '~/pages/Admin/components/InspectorTable/InspectorTable';
import type {InspectedEntry} from '~/types/accountInspection';
import type {
	ProductCategories,
	ProductOption,
	Specification,
} from '~/types/product';
import type {InspectedProduct, InspectedSKU} from '~/types/productInspection';

export type SpecificationRow = InspectedEntry & {
	category: string;
	priority?: number;
	specificationKey: string;
	title: string;
	value: string;
	visible?: boolean;
};

export type CategoryRow = InspectedEntry & ProductCategories;

export type OptionRow = InspectedEntry &
	Omit<ProductOption, 'name'> & {
		name: string;
	};

export function getSpecificationRows(
	product: InspectedProduct,
	specifications: Specification[]
): SpecificationRow[] {
	const specificationsByKey = new Map(
		specifications.map((specification) => [
			specification.key,
			specification,
		])
	);

	return (product.productSpecifications ?? [])
		.map(
			(
				{id, priority, specificationKey, value, visible},
				position
			): SpecificationRow => {
				const specification = specificationsByKey.get(specificationKey);

				return {
					category: getLocalizedValue(
						specification?.optionCategory?.title
					),
					id: toSpecificationRowId(id, position),
					priority,
					specificationKey,
					title: getLocalizedValue(specification?.title),
					value: getLocalizedValue(value),
					visible,
				};
			}
		)
		.sort((row1, row2) =>
			row1.specificationKey.localeCompare(row2.specificationKey)
		);
}

export function getOptionRows(product: InspectedProduct): OptionRow[] {
	return (product.productOptions ?? []).map((productOption) => ({
		...productOption,
		name: getLocalizedValue(productOption.name),
	}));
}

export const SPECIFICATION_COLUMNS: InspectorTableColumn<SpecificationRow>[] = [
	{
		label: 'key',
		sortable: true,
		value: ({specificationKey}) => specificationKey,
	},
	{label: 'title', sortable: true, value: ({title}) => title},
	{label: 'value', sortable: true, value: ({value}) => value},
	{label: 'category', sortable: true, value: ({category}) => category},
	{hidden: true, label: 'priority', value: ({priority}) => priority},
	{hidden: true, label: 'visible', value: ({visible}) => visible},
	{hidden: true, label: 'id', value: ({id}) => (id > 0 ? id : '')},
];

export const CATEGORY_COLUMNS: InspectorTableColumn<CategoryRow>[] = [
	{label: 'name', sortable: true, value: ({name}) => name},
	{label: 'vocabulary', sortable: true, value: ({vocabulary}) => vocabulary},
	{
		label: 'external-reference-code',
		sortable: true,
		value: ({externalReferenceCode}) => externalReferenceCode,
	},
	{label: 'id', sortable: true, value: ({id}) => id},
];

export const OPTION_COLUMNS: InspectorTableColumn<OptionRow>[] = [
	{label: 'name', sortable: true, value: ({name}) => name},
	{label: 'key', sortable: true, value: ({key}) => key},
	{label: 'field-type', sortable: true, value: ({fieldType}) => fieldType},
	{label: 'required', sortable: true, value: ({required}) => required},
	{
		label: 'sku-contributor',
		sortable: true,
		value: ({skuContributor}) => skuContributor,
	},
	{label: 'id', sortable: true, value: ({id}) => id},
];

export function getSKUColumns(
	index: CatalogIndex,
	productId: number
): InspectorTableColumn<InspectedSKU>[] {
	const getSKUEntitlementDefinitions = ({
		externalReferenceCode,
	}: InspectedSKU) =>
		index.entitlementDefinitionsBySKU?.get(externalReferenceCode ?? '') ??
		[];

	return [
		{label: 'sku', sortable: true, value: ({sku}) => sku},
		{
			hidden: true,
			label: 'external-reference-code',
			sortable: true,
			value: ({externalReferenceCode}) => externalReferenceCode,
		},
		{
			label: 'options',
			value: ({skuOptions}) =>
				(skuOptions ?? []).map(({key, value}) => `${key}: ${value}`),
		},
		{
			label: 'entitlement-definitions',
			render: (sku) =>
				getSKUEntitlementDefinitions(sku).map(
					(entitlementDefinition, position) => (
						<Fragment key={entitlementDefinition.id}>
							{position > 0 && ', '}

							<Link
								to={getEntitlementDefinitionPath(
									entitlementDefinition.id,
									productId
								)}
							>
								{getEntitlementDefinitionName(
									entitlementDefinition
								)}
							</Link>
						</Fragment>
					)
				),
			value: (sku) =>
				getSKUEntitlementDefinitions(sku).map(
					getEntitlementDefinitionName
				),
		},
		{label: 'price', sortable: true, value: ({price}) => price},
		{label: 'published', sortable: true, value: ({published}) => published},
		{
			label: 'purchasable',
			sortable: true,
			value: ({purchasable}) => purchasable,
		},
		{
			hidden: true,
			label: 'discontinued',
			sortable: true,
			value: ({discontinued}) => discontinued,
		},
		{hidden: true, label: 'id', value: ({id}) => id},
	];
}
