/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ListView from '~/components/ListView/ListView';
import Page from '~/components/Page/Page';
import i18n from '~/i18n';
import {formatDate} from '~/utils/dateUtils';

import type {Account} from '~/types/accounts';

export default function AccountInspector() {
	return (
		<Page
			description={i18n.translate(
				'search-for-an-account-to-see-its-records-and-the-problems-found-in-them'
			)}
			pageRendererProps={{className: 'border py-2 rounded-lg'}}
			title={i18n.translate('account-inspector')}
		>
			<ListView<Account>
				id="administrator-account-inspector"
				managementToolbarProps={{
					filterSchema: 'administratorAccounts',
					searchVisible: true,
					visible: true,
				}}
				resource={`/o/headless-admin-user/v1.0/accounts?${new URLSearchParams({sort: 'name:asc'})}`}
				tableProps={{
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
							render: (dateCreated) => formatDate(dateCreated),
							sortable: true,
						},
					],
					navigateTo: (account) => `/account-inspector/${account.id}`,
					rowWrap: true,
				}}
			/>
		</Page>
	);
}
