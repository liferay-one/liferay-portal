/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Link} from 'react-router';
import {getProductName} from '~/pages/Admin/ProductInspector/utils/productCatalogUtils';
import {getProductPath} from '~/pages/Admin/ProductInspector/utils/productInspectorColumnsUtils';

import type {InspectorTableColumn} from '~/pages/Admin/components/InspectorTable/InspectorTable';
import type {InspectedProduct} from '~/types/productInspection';

import type {SKUOptionRow} from './getSKUOptionRows';

export const SKU_OPTION_COLUMNS: InspectorTableColumn<SKUOptionRow>[] = [
	{label: 'name', sortable: true, value: ({optionName}) => optionName},
	{label: 'key', sortable: true, value: ({key}) => key},
	{label: 'value', sortable: true, value: ({value}) => value},
	{hidden: true, label: 'option-id', value: ({optionId}) => optionId},
	{
		hidden: true,
		label: 'option-value-id',
		value: ({id}) => (id > 0 ? id : ''),
	},
];

export const SHARED_PRODUCT_COLUMNS: InspectorTableColumn<InspectedProduct>[] =
	[
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
		{
			label: 'external-reference-code',
			sortable: true,
			value: ({externalReferenceCode}) => externalReferenceCode,
		},
		{
			label: 'status',
			sortable: true,
			value: ({workflowStatusInfo}) => workflowStatusInfo?.label_i18n,
		},
		{label: 'id', sortable: true, value: ({id}) => id},
	];
