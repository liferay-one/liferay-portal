/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import ClayLabel from '@clayui/label';
import {useMemo, useState} from 'react';
import Loading from '~/components/Loading/Loading';
import {useDataQuery} from '~/hooks/useDataQuery';
import i18n from '~/i18n';
import InspectorTable from '~/pages/Admin/components/InspectorTable/InspectorTable';
import {toErrorMessage} from '~/services/queries/accountInspectionQuery';
import {accountSalesforceRecordsQuery} from '~/services/queries/accountSalesforceRecordsQuery';

import getSalesforceEntries from '../../utils/getSalesforceEntries';
import InspectorSection from '../InspectorSection/InspectorSection';

import type {Word} from '~/i18n';
import type {InspectorTableColumn} from '~/pages/Admin/components/InspectorTable/InspectorTable';
import type {
	AccountInspection,
	SalesforceEntry,
	SalesforceFieldDifference,
	SalesforceRecordStatus,
} from '~/types/accountInspection';

const NO_ENTRIES: SalesforceEntry[] = [];

const STATUS_DISPLAY_TYPES: Record<
	SalesforceRecordStatus,
	'danger' | 'secondary' | 'success' | 'warning'
> = {
	'differs-from-salesforce': 'warning',
	'in-sync': 'success',
	'missing-in-liferay': 'danger',
	'missing-in-salesforce': 'secondary',
};

const FIELD_LABELS: Record<string, Word> = {
	accountTier: 'account-tier',
	aiHubAccountName: 'ai-hub-account-name',
	allowedEmailDomains: 'allowed-email-domains',
	contractTerm: 'contract-term',
	dataCenterLocation: 'data-center-location',
	description: 'description',
	endDate: 'end-date',
	friendlyWorkspaceURL: 'friendly-workspace-url',
	liferayVersion: 'liferay-version',
	name: 'name',
	opportunityId: 'opportunity-id',
	renewalOpportunityId: 'renewal-opportunity-id',
	securityContactEmailAddress: 'security-contact-email-address',
	startDate: 'start-date',
};

function toDifferenceText({
	fieldName,
	liferayValue,
	salesforceValue,
}: SalesforceFieldDifference) {
	const fieldLabel = FIELD_LABELS[fieldName]
		? i18n.translate(FIELD_LABELS[fieldName])
		: fieldName;

	if (!liferayValue) {
		return i18n.sub('x-is-empty-in-liferay-and-x-in-salesforce', [
			fieldLabel,
			salesforceValue,
		]);
	}

	return i18n.sub('x-is-x-in-liferay-and-x-in-salesforce', [
		fieldLabel,
		liferayValue,
		salesforceValue,
	]);
}

const COLUMNS: InspectorTableColumn<SalesforceEntry>[] = [
	{label: 'type', value: ({type}) => i18n.translate(type)},
	{label: 'name', value: ({name}) => name},
	{
		label: 'external-reference-code',
		value: ({externalReferenceCode}) => externalReferenceCode,
	},
	{
		label: 'status',
		render: ({status}) => (
			<ClayLabel displayType={STATUS_DISPLAY_TYPES[status]}>
				{i18n.translate(status)}
			</ClayLabel>
		),
		value: ({status}) => i18n.translate(status),
	},
	{
		label: 'differences',
		render: ({differences}) => (
			<ul className="list-unstyled mb-0">
				{differences.map((difference) => (
					<li key={difference.fieldName}>
						{toDifferenceText(difference)}
					</li>
				))}
			</ul>
		),
		value: ({differences}) => differences.map(toDifferenceText).join(' '),
	},
];

type SalesforceRecordsProps = {
	inspection: AccountInspection;
};

export default function SalesforceRecords({
	inspection,
}: SalesforceRecordsProps) {
	const [opened, setOpened] = useState(false);

	const {data, error, isLoading} = useDataQuery(
		accountSalesforceRecordsQuery(
			opened ? inspection.account.externalReferenceCode : undefined,
			inspection.loadedAt
		),
		{revalidateOnFocus: false}
	);

	const entries = useMemo(
		() => (data ? getSalesforceEntries(data.records) : NO_ENTRIES),
		[data]
	);

	const flaggedIds = useMemo(
		() =>
			new Set(
				entries
					.filter(({status}) => status !== 'in-sync')
					.map(({id}) => id)
			),
		[entries]
	);

	if (!opened) {
		return (
			<InspectorSection
				onExpandedChange={(expanded) => {
					if (expanded) {
						setOpened(true);
					}
				}}
				title={i18n.translate('salesforce')}
			>
				<Loading size="sm" />
			</InspectorSection>
		);
	}

	if (isLoading) {
		return (
			<InspectorSection
				defaultExpanded
				title={i18n.translate('salesforce')}
			>
				<Loading size="sm" />
			</InspectorSection>
		);
	}

	return (
		<InspectorTable
			columns={COLUMNS}
			defaultExpanded
			entries={entries}
			error={error ? toErrorMessage(error) : undefined}
			flaggedIds={flaggedIds}
			id="account-inspector-salesforce"
			notice={
				<ClayAlert displayType="info">
					{i18n.translate(
						'the-salesforce-sync-updates-the-records-that-differ'
					)}
				</ClayAlert>
			}
			title={i18n.translate('salesforce')}
		/>
	);
}
