/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLabel from '@clayui/label';
import {useMemo} from 'react';
import Loading from '~/components/Loading/Loading';
import {useDataQuery} from '~/hooks/useDataQuery';
import i18n from '~/i18n';
import InspectorTable from '~/pages/Admin/components/InspectorTable/InspectorTable';
import {toErrorMessage} from '~/services/queries/accountInspectionQuery';
import {accountJiraAssetsQuery} from '~/services/queries/accountJiraAssetsQuery';

import getJSMRecords from '../../utils/getJSMRecords';
import InspectorSection from '../InspectorSection/InspectorSection';
import JSMSyncButton from '../JSMSyncButton/JSMSyncButton';

import type {InspectorTableColumn} from '~/pages/Admin/components/InspectorTable/InspectorTable';
import type {AccountInspection, JSMRecord} from '~/types/accountInspection';

const NO_RECORDS: JSMRecord[] = [];

function getStatus({drift}: JSMRecord) {
	return drift.length
		? drift.map((word) => i18n.translate(word)).join(', ')
		: i18n.translate('in-sync');
}

function getColumns(onSynced: () => void): InspectorTableColumn<JSMRecord>[] {
	return [
		{label: 'type', value: ({type}) => i18n.translate(type)},
		{label: 'name', value: ({name}) => name},
		{
			label: 'external-reference-code',
			value: ({externalReferenceCode}) => externalReferenceCode,
		},
		{
			label: 'jsm-object-key',
			value: ({jiraAsset}) => jiraAsset?.objectKey,
		},
		{
			label: 'status',
			render: (record) =>
				record.drift.length ? (
					record.drift.map((word) => (
						<ClayLabel
							displayType={
								word === 'missing-in-jsm' ? 'danger' : 'warning'
							}
							key={word}
						>
							{i18n.translate(word)}
						</ClayLabel>
					))
				) : (
					<ClayLabel displayType="success">
						{i18n.translate('in-sync')}
					</ClayLabel>
				),
			value: getStatus,
		},
		{
			label: 'actions',
			render: (record) => (
				<JSMSyncButton onSynced={onSynced} record={record} />
			),
			value: () => '',
		},
	];
}

type JSMRecordsProps = {
	inspection: AccountInspection;
};

export default function JSMRecords({inspection}: JSMRecordsProps) {
	const {data, error, isLoading, mutate} = useDataQuery(
		accountJiraAssetsQuery(
			inspection.account.externalReferenceCode,
			inspection.loadedAt
		),
		{revalidateOnFocus: false}
	);

	const records = useMemo(
		() => (data ? getJSMRecords(inspection, data) : NO_RECORDS),
		[data, inspection]
	);

	const columns = useMemo(() => getColumns(() => mutate()), [mutate]);

	const flaggedIds = useMemo(
		() =>
			new Set(
				records.filter(({drift}) => drift.length).map(({id}) => id)
			),
		[records]
	);

	if (isLoading) {
		return (
			<InspectorSection defaultExpanded title={i18n.translate('jsm')}>
				<Loading size="sm" />
			</InspectorSection>
		);
	}

	return (
		<InspectorTable
			columns={columns}
			entries={records}
			error={error ? toErrorMessage(error) : undefined}
			flaggedIds={flaggedIds}
			id="account-inspector-jsm"
			title={i18n.translate('jsm')}
		/>
	);
}
