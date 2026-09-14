/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useDataQuery} from '~/hooks/useDataQuery';
import {queryGraphQL, toGraphQLString} from '~/services/graphql/GraphQL';
import {Liferay} from '~/services/liferay/liferay';

import type {Account} from '~/types/accounts';
import type {APIResponse, DataQuery} from '~/types/api';

const ACCOUNT_FIELDS = 'externalReferenceCode id logoURL name type';

const ACCOUNTS_PAGE_SIZE = 20;

function toAccount(account: Account): Account {
	return {...account, type: account.type?.toLowerCase()};
}

export function accountsQuery(
	accountId?: number | string | null,
	search = ''
): DataQuery<APIResponse<Account>> {
	const filter = search
		? `contains(name, '${search.replace(/'/g, "''")}')`
		: '';

	return {
		fetcher: () =>
			queryGraphQL<{accounts: APIResponse<Account>}>(
				`headlessAdminUser_v1_0 { accounts(${
					filter ? `filter: ${toGraphQLString(filter)}, ` : ''
				}page: 1, pageSize: ${ACCOUNTS_PAGE_SIZE}, sort: "name:asc") { items { ${ACCOUNT_FIELDS} } totalCount } }`
			).then((data) => ({
				...data.accounts,
				items: data.accounts.items.map(toAccount),
			})),
		key: accountId ? `/graphql/accounts/${accountId}/${search}` : null,
	};
}

export function currentAccountQuery(
	accountId?: number | string | null
): DataQuery<Account> {
	return {
		fetcher: () =>
			queryGraphQL<{account: Account}>(
				`headlessAdminUser_v1_0 { account(accountId: ${accountId}) { ${ACCOUNT_FIELDS} } }`
			).then((data) => toAccount(data.account)),
		key: accountId ? `/graphql/account/${accountId}` : null,
	};
}

export function useAccounts(search = '') {
	return useDataQuery(
		accountsQuery(Liferay.CommerceContext.account?.accountId, search)
	);
}

export function useCurrentAccount() {
	return useDataQuery(
		currentAccountQuery(Liferay.CommerceContext.account?.accountId)
	);
}
