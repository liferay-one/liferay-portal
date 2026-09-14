/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Navigate} from 'react-router-dom';
import Loading from '~/components/Loading/Loading';
import {useCurrentAccount} from '~/hooks/useAccounts';
import {Liferay} from '~/services/liferay/liferay';


export default function MyAccount() {
	const currentAccountId = Liferay.CommerceContext.account?.accountId;

	const {data: account, isLoading: loading} = useCurrentAccount();

	if (account) {
		return (
			<Navigate
				replace
				to={`/${account.externalReferenceCode}/project`}
			/>
		);
	}

	if (!currentAccountId || !loading) {
		return null;
	}

	return <Loading.Page />;
}
