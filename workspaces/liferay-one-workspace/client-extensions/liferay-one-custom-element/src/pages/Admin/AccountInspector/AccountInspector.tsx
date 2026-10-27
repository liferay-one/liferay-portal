/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useNavigate} from 'react-router';
import ListView from '~/components/ListView/ListView';
import Page from '~/components/Page/Page';
import {useDataQuery} from '~/hooks/useDataQuery';
import i18n from '~/i18n';
import InspectorStats from '~/pages/Admin/components/InspectorStats/InspectorStats';
import {accountInspectorMetricsQuery} from '~/services/queries/accountInspectorMetricsQuery';
import {accountOrphansQuery} from '~/services/queries/accountOrphansQuery';
import {formatDate} from '~/utils/dateUtils';

import AccountOrphans from './components/AccountOrphans/AccountOrphans';
import getAccountPath from './utils/getAccountPath';

import type {Account} from '~/types/accounts';

export default function AccountInspector() {
	const navigate = useNavigate();

	const {data: metrics} = useDataQuery(accountInspectorMetricsQuery(), {
		revalidateOnFocus: false,
	});

	const {data: orphans} = useDataQuery(accountOrphansQuery(), {
		revalidateOnFocus: false,
	});

	const orphanCount =
		orphans &&
		Object.values(orphans).reduce(
			(count, {items}) => count + items.length,
			0
		);

	return (
		<Page
			description={i18n.translate(
				'search-for-an-account-to-see-its-records-and-the-problems-found-in-them'
			)}
			title={i18n.translate('account-inspector')}
		>
			<InspectorStats
				stats={[
					{label: 'accounts', value: metrics?.accounts},
					{label: 'projects', value: metrics?.projects},
					{label: 'contracts', value: metrics?.contracts},
					{label: 'entitlements', value: metrics?.entitlements},
					{
						label: 'orphans',
						severity: orphanCount ? 'warning' : undefined,
						value: orphanCount,
					},
				]}
			/>

			<div className="border py-2 rounded-lg">
				<ListView<Account>
					id="administrator-account-inspector"
					managementToolbarProps={{
						columnsVisible: true,
						filterIconOnly: true,
						filterSchema: 'administratorAccounts',
						searchVisible: true,
						visible: true,
					}}
					resource={`/o/headless-admin-user/v1.0/accounts?${new URLSearchParams({sort: 'name:asc'})}`}
					tableProps={{
						actions: [
							{
								name: i18n.translate('view'),
								onClick: (account: Account) =>
									navigate(
										getAccountPath(
											account.externalReferenceCode
										)
									),
							},
						],
						columns: [
							{
								clickable: true,
								id: 'name',
								name: i18n.translate('name'),
								render: (name) => <b>{name}</b>,
								sortable: true,
							},
							{
								id: 'id',
								name: i18n.translate('id'),
							},
							{
								id: 'externalReferenceCode',
								name: i18n.translate('external-reference-code'),
							},
							{
								id: 'type',
								name: i18n.translate('type'),
							},
							{
								id: 'dateCreated',
								name: i18n.translate('created-at'),
								render: (dateCreated) =>
									formatDate(dateCreated),
								sortable: true,
							},
						],
						navigateTo: (account) =>
							getAccountPath(account.externalReferenceCode),
						rowWrap: true,
					}}
				/>
			</div>

			{orphans && <AccountOrphans orphans={orphans} />}
		</Page>
	);
}
