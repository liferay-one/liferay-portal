/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Link} from 'react-router';
import i18n from '~/i18n';
import {formatInspectedValue} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/inspectorFilterUtils';
import {getProductName} from '~/pages/Admin/ProductInspector/utils/productCatalogUtils';
import {getProductPath} from '~/pages/Admin/ProductInspector/utils/productInspectorColumnsUtils';
import {formatDate} from '~/utils/dateUtils';

import type {InspectorTableColumn} from '~/pages/Admin/components/InspectorTable/InspectorTable';
import type {InspectedEntry} from '~/types/accountInspection';

import type {SKUProductRow} from './getSKUProductRows';

export const SKU_PRODUCT_COLUMNS: InspectorTableColumn<SKUProductRow>[] = [
	{
		label: 'sku',
		sortable: true,
		value: ({skuExternalReferenceCode}) => skuExternalReferenceCode,
	},
	{
		label: 'product',
		render: ({product}) =>
			product ? (
				<Link to={getProductPath(product.id)}>
					<b>{getProductName(product)}</b>
				</Link>
			) : (
				<span className="text-danger">
					{i18n.translate('no-product')}
				</span>
			),
		sortable: true,
		value: ({product}) => (product ? getProductName(product) : ''),
	},
	{
		label: 'status',
		sortable: true,
		value: ({product}) => product?.workflowStatusInfo?.label_i18n,
	},
	{label: 'published', sortable: true, value: ({sku}) => sku?.published},
	{label: 'purchasable', sortable: true, value: ({sku}) => sku?.purchasable},
];

export const ENTITLEMENT_COLUMNS: InspectorTableColumn<InspectedEntry>[] = [
	{label: 'id', sortable: true, value: ({id}) => id},
	{
		label: 'account',
		render: (entitlement) =>
			entitlement.r_accountEntryToEntitlement_accountEntryId ? (
				<Link
					to={`/account-inspector/${entitlement.r_accountEntryToEntitlement_accountEntryId}`}
				>
					{String(
						entitlement.r_accountEntryToEntitlement_accountEntryERC
					)}
				</Link>
			) : (
				formatInspectedValue(
					entitlement.r_accountEntryToEntitlement_accountEntryERC
				)
			),
		sortable: true,
		value: (entitlement) =>
			entitlement.r_accountEntryToEntitlement_accountEntryERC,
	},
	{
		label: 'project',
		sortable: true,
		value: (entitlement) => entitlement.r_projectToEntitlement_c_projectERC,
	},
	{
		label: 'contract',
		sortable: true,
		value: (entitlement) =>
			entitlement.r_contractToEntitlement_c_contractERC,
	},
	{
		label: 'sku',
		sortable: true,
		value: ({skuExternalReferenceCode}) => skuExternalReferenceCode,
	},
	{label: 'quantity', sortable: true, value: ({quantity}) => quantity},
	{
		label: 'start-date',
		render: ({startDate}) =>
			formatDate(startDate as string | undefined, ''),
		sortable: true,
		value: ({startDate}) => startDate,
	},
	{
		label: 'end-date',
		render: ({endDate}) => formatDate(endDate as string | undefined, ''),
		sortable: true,
		value: ({endDate}) => endDate,
	},
	{
		hidden: true,
		label: 'external-reference-code',
		sortable: true,
		value: ({externalReferenceCode}) => externalReferenceCode,
	},
];
