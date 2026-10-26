/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import DetailTable from '~/components/DetailTable/DetailTable';
import i18n from '~/i18n';
import InspectorSection from '~/pages/Admin/AccountInspector/AccountInspectorDetail/components/InspectorSection/InspectorSection';
import {formatInspectedValue} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/inspectorFilterUtils';
import InspectorJSON from '~/pages/Admin/ProductInspector/components/InspectorJSON/InspectorJSON';
import {formatDate} from '~/utils/dateUtils';

import type {InspectedProduct} from '~/types/productInspection';

type ProductSummaryProps = {
	catalogName?: string;
	id: string;
	product: InspectedProduct;
};

export default function ProductSummary({
	catalogName,
	id,
	product,
}: ProductSummaryProps) {
	return (
		<InspectorSection
			defaultExpanded
			id={id}
			title={i18n.translate('product-details')}
		>
			<InspectorJSON record={product} />

			<DetailTable
				columns={2}
				items={[
					{
						title: i18n.translate('id'),
						value: formatInspectedValue(product.id),
					},
					{
						title: i18n.translate('product-id'),
						value: formatInspectedValue(product.productId),
					},
					{
						title: i18n.translate('external-reference-code'),
						value: formatInspectedValue(
							product.externalReferenceCode
						),
					},
					{
						title: i18n.translate('catalog'),
						value: formatInspectedValue(
							catalogName ?? product.catalogId
						),
					},
					{
						title: i18n.translate('product-type'),
						value: formatInspectedValue(product.productType),
					},
					{
						title: i18n.translate('status'),
						value: formatInspectedValue(
							product.workflowStatusInfo?.label_i18n
						),
					},
					{
						title: i18n.translate('active'),
						value: formatInspectedValue(product.active),
					},
					{
						title: i18n.translate('version'),
						value: formatInspectedValue(product.version),
					},
					{
						title: i18n.translate('date-created'),
						value: formatDate(product.createDate),
					},
					{
						title: i18n.translate('modified-date'),
						value: formatDate(product.modifiedDate),
					},
					...(product.customFields ?? []).map(
						({customValue, name}) => ({
							title: name,
							value: formatInspectedValue(customValue?.data),
						})
					),
				]}
			/>
		</InspectorSection>
	);
}
