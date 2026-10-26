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
import type {InspectedEntry} from '~/types/accountInspection';
import type {InspectedEntitlementDefinition} from '~/types/productInspection';

const ENTITLEMENT_DEFINITION_FIELDS: [Word, string][] = [
	['id', 'id'],
	['external-reference-code', 'externalReferenceCode'],
	['name', 'name'],
	['display-name', 'displayName'],
	['active', 'active'],
	['grant-type', 'grantType'],
	['unit', 'unit'],
	['default-quantity', 'defaultQuantity'],
	['max-quantity', 'maxQuantity'],
	['generates-activation-key', 'generatesActivationKey'],
	['license-key-family', 'licenseKeyFamily'],
	['license-key-type', 'licenseKeyType'],
	['license-key-duration-days', 'licenseKeyDurationDays'],
	['overage-rate', 'overageRate'],
	['overage-sku', 'overageSkuExternalReferenceCode'],
	['product-options', 'productOptions'],
];

const USAGE_DEFINITION_FIELDS: [Word, string][] = [
	['id', 'id'],
	['external-reference-code', 'externalReferenceCode'],
	['unit', 'unit'],
	['aggregation-type', 'aggregationType'],
	['period', 'period'],
	['overage-bucket-size', 'overageBucketSize'],
	['usage-source', 'usageSource'],
	['usage-source-metric-key', 'usageSourceMetricKey'],
	['usage-source-unit', 'usageSourceUnit'],
];

function toDetailItems(entry: InspectedEntry, fields: [Word, string][]) {
	return fields.map(([label, fieldName]) => ({
		title: i18n.translate(label),
		value: formatInspectedValue(entry[fieldName]),
	}));
}

type EntitlementDefinitionSummaryProps = {
	entitlementDefinition: InspectedEntitlementDefinition;
	id: string;
	usageDefinition?: InspectedEntry;
	usageDefinitionId: string;
};

export default function EntitlementDefinitionSummary({
	entitlementDefinition,
	id,
	usageDefinition,
	usageDefinitionId,
}: EntitlementDefinitionSummaryProps) {
	return (
		<InspectorSection
			defaultExpanded
			id={id}
			title={i18n.translate('entitlement-definition-details')}
		>
			<InspectorJSON record={entitlementDefinition} />

			<DetailTable
				columns={2}
				items={[
					...toDetailItems(
						entitlementDefinition,
						ENTITLEMENT_DEFINITION_FIELDS
					),
					{
						title: i18n.translate('date-created'),
						value: formatDate(entitlementDefinition.dateCreated),
					},
					{
						title: i18n.translate('modified-date'),
						value: formatDate(entitlementDefinition.dateModified),
					},
				]}
			/>

			<h4 className="mb-3 mt-4" id={usageDefinitionId}>
				{i18n.translate('usage-definition')}
			</h4>

			{usageDefinition ? (
				<DetailTable
					columns={2}
					items={toDetailItems(
						usageDefinition,
						USAGE_DEFINITION_FIELDS
					)}
				/>
			) : (
				<p className="mb-0 text-secondary">
					{i18n.translate('no-usage-definition')}
				</p>
			)}
		</InspectorSection>
	);
}
