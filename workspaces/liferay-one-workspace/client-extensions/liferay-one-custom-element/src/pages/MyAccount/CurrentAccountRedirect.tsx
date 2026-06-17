/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLoadingIndicator from '@clayui/loading-indicator';
import {Navigate, useLocation} from 'react-router-dom';

import {useFetch} from '../../hooks/useFetch';
import {Liferay} from '../../liferay/liferay';

// Forwards an account-level deep link that omits the account external reference
// code (such as the site navigation menu's /#/orders) to the same path under
// the current commerce account. The account ERC became part of the route, so
// these otherwise unprefixed links would match the :accountERC segment, fail to
// resolve an account, and bounce back to the project page.

export default function CurrentAccountRedirect() {
	const currentAccountId = Liferay.CommerceContext.account?.accountId;

	const {pathname} = useLocation();

	const {data: account, loading} = useFetch<Account>(
		currentAccountId
			? `/o/headless-admin-user/v1.0/accounts/${currentAccountId}`
			: null
	);

	if (account) {
		return (
			<Navigate
				replace
				to={`/${account.externalReferenceCode}${pathname}`}
			/>
		);
	}

	if (!currentAccountId || !loading) {
		return null;
	}

	return (
		<div className="mx-auto p-4">
			<ClayLoadingIndicator size="sm" />
		</div>
	);
}
