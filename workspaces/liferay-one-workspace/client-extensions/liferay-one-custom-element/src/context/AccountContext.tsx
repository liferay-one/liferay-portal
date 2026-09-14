/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {createContext, useContext, useEffect, useState} from 'react';
import {Outlet, useParams} from 'react-router-dom';
import EmptyState from '~/components/EmptyState/EmptyState';
import Loading from '~/components/Loading/Loading';
import {useCurrentAccount} from '~/hooks/useAccounts';
import {useFetch} from '~/hooks/useFetch';
import {translate} from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import {setCurrentAccount} from '~/utils/setCurrentAccount';

import type {Account} from '~/types/accounts';

type AccountContextValue = {
	account?: Account;
	loading: boolean;
};

const AccountContext = createContext<AccountContextValue>(
	{} as AccountContextValue
);

export function AccountProvider() {
	const {accountERC} = useParams();

	const currentAccountId = Liferay.CommerceContext.account?.accountId;

	const [switching, setSwitching] = useState(false);

	const {data: currentAccount, isLoading: currentAccountLoading} =
		useCurrentAccount();

	const matchesCurrentAccount =
		currentAccount?.externalReferenceCode === accountERC;

	const needsRequestedAccount = Boolean(
		accountERC &&
			(!currentAccountId || (currentAccount && !matchesCurrentAccount))
	);

	const {
		data: requestedAccount,
		error,
		isLoading: requestedAccountLoading,
	} = useFetch<Account>(
		needsRequestedAccount
			? `/o/headless-admin-user/v1.0/accounts/by-external-reference-code/${accountERC}`
			: null
	);

	const needsSwitch = Boolean(currentAccountId && requestedAccount);

	useEffect(() => {
		if (!needsSwitch || !requestedAccount) {
			return;
		}

		setSwitching(true);

		setCurrentAccount(String(requestedAccount.id))
			.then(() => window.location.reload())
			.catch(() => setSwitching(false));
	}, [needsSwitch, requestedAccount]);

	if (error) {
		return (
			<EmptyState
				className="mt-5"
				title={translate('you-do-not-have-access-to-this-account')}
				type="NO_ACCESS"
			/>
		);
	}

	return (
		<AccountContext.Provider
			value={{
				account: matchesCurrentAccount
					? currentAccount
					: requestedAccount,
				loading:
					currentAccountLoading ||
					requestedAccountLoading ||
					needsSwitch ||
					switching,
			}}
		>
			{switching && (
				<Loading.FullScreen>{translate('loading')}</Loading.FullScreen>
			)}

			<Outlet />
		</AccountContext.Provider>
	);
}

export function useAccount() {
	return useContext(AccountContext);
}
