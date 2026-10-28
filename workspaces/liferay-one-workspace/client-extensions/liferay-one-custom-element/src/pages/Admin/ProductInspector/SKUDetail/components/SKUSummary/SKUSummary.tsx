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

import type {Word} from '~/i18n';
import type {InspectedSKU} from '~/types/productInspection';

const SKU_FIELDS: [Word, string][] = [
	['id', 'id'],
	['sku', 'sku'],
	['external-reference-code', 'externalReferenceCode'],
	['price', 'price'],
	['promo-price', 'promoPrice'],
	['cost', 'cost'],
	['published', 'published'],
	['purchasable', 'purchasable'],
	['discontinued', 'discontinued'],
	['gtin', 'gtin'],
	['manufacturer-part-number', 'manufacturerPartNumber'],
];

type SKUSummaryProps = {
	id: string;
	productName: string;
	sku: InspectedSKU;
};

export default function SKUSummary({id, productName, sku}: SKUSummaryProps) {
	return (
		<InspectorSection
			defaultExpanded
			id={id}
			title={i18n.translate('sku-details')}
		>
			<InspectorJSON record={sku} />

			<DetailTable
				columns={2}
				items={[
					...SKU_FIELDS.map(([label, fieldName]) => ({
						title: i18n.translate(label),
						value: formatInspectedValue(sku[fieldName]),
					})),
					{
						title: i18n.translate('product'),
						value: productName,
					},
					{
						title: i18n.translate('display-date'),
						value: formatDate(sku.displayDate),
					},
					...(sku.customFields ?? []).map(({customValue, name}) => ({
						title: name,
						value: formatInspectedValue(customValue?.data),
					})),
				]}
			/>
		</InspectorSection>
	);
}
