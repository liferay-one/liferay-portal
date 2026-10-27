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
import {accountJiraAssetsQuery} from '~/services/queries/accountJiraAssetsQuery';

import getJSMProjectQualification from '../../utils/getJSMProjectQualification';
import getJSMRecords from '../../utils/getJSMRecords';
import {JSM_PROJECT_ENTITLEMENT_NAMES} from '../../utils/jsmSyncConstants';
import syncRecordToJSM from '../../utils/syncRecordToJSM';
import InspectorSection from '../InspectorSection/InspectorSection';

import type {RowAction} from '~/components/RowActionsMenu/RowActionsMenu';
import type {InspectorTableColumn} from '~/pages/Admin/components/InspectorTable/InspectorTable';
import type {AccountInspection, JSMRecord} from '~/types/accountInspection';

const NO_RECORDS: JSMRecord[] = [];

function getStatus({drift}: JSMRecord) {
	return drift.length
		? drift.map((word) => i18n.translate(word)).join(', ')
		: i18n.translate('in-sync');
}

const COLUMNS: InspectorTableColumn<JSMRecord>[] = [
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
];

type JSMRecordsProps = {
	inspection: AccountInspection;
};

export default function JSMRecords({inspection}: JSMRecordsProps) {
	const {nonqualifyingProjects, qualifyingProjects} = useMemo(
		() => getJSMProjectQualification(inspection),
		[inspection]
	);

	const {data, error, isLoading, mutate} = useDataQuery(
		accountJiraAssetsQuery(
			qualifyingProjects.length
				? inspection.account.externalReferenceCode
				: undefined,
			inspection.loadedAt
		),
		{revalidateOnFocus: false}
	);

	const records = useMemo(
		() => (data ? getJSMRecords(qualifyingProjects, data) : NO_RECORDS),
		[data, qualifyingProjects]
	);

	const [syncingIds, setSyncingIds] = useState<Set<number | string>>(
		new Set()
	);

	const syncRecord = async (record: JSMRecord) => {
		setSyncingIds((ids) => new Set(ids).add(record.id));

		if (await syncRecordToJSM(record)) {
			mutate();
		}

		setSyncingIds((ids) => {
			const remainingIds = new Set(ids);

			remainingIds.delete(record.id);

			return remainingIds;
		});
	};

	const getRecordActions = (record: JSMRecord): RowAction[] => {
		const syncing = syncingIds.has(record.id);

		return [
			{
				disabled: syncing || !record.externalReferenceCode,
				label: syncing ? 'syncing-to-jsm' : 'sync-to-jsm',
				onClick: () => syncRecord(record),
			},
		];
	};

	const flaggedIds = useMemo(
		() =>
			new Set(
				records.filter(({drift}) => drift.length).map(({id}) => id)
			),
		[records]
	);

	const qualificationNote = Boolean(nonqualifyingProjects.length) && (
		<ClayAlert
			displayType="info"
			title={i18n.translate(
				qualifyingProjects.length
					? 'some-projects-do-not-qualify-for-the-jsm-sync'
					: 'no-projects-qualify-for-the-jsm-sync'
			)}
		>
			<p className="mb-1">
				{i18n.sub(
					'a-project-qualifies-for-the-jsm-sync-when-x',
					JSM_PROJECT_ENTITLEMENT_NAMES.join(', ')
				)}
			</p>

			<p className="mb-0">
				{i18n.sub(
					'projects-that-do-not-qualify-x',
					nonqualifyingProjects
						.map(({id, name}) => String(name || `#${id}`))
						.join(', ')
				)}
			</p>
		</ClayAlert>
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
			columns={COLUMNS}
			entries={records}
			error={error ? toErrorMessage(error) : undefined}
			flaggedIds={flaggedIds}
			getRowActions={getRecordActions}
			id="account-inspector-jsm"
			notice={qualificationNote}
			title={i18n.translate('jsm')}
		/>
	);
}
