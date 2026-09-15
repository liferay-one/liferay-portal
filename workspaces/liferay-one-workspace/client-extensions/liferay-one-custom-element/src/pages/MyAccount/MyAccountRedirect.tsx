/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Navigate, useLocation} from 'react-router-dom';
import EmptyState from '~/components/EmptyState/EmptyState';
import Loading from '~/components/Loading/Loading';
import {useCurrentAccount} from '~/hooks/useAccounts';
import {translate} from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';

export default function MyAccountRedirect() {
	const currentAccountId = Liferay.CommerceContext.account?.accountId;

	const {pathname} = useLocation();

	const {data: account, isLoading: loading} = useCurrentAccount();

	if (account) {
		return (
			<Navigate
				replace
				to={`/${account.externalReferenceCode}${pathname}`}
			/>
		);
	}

	if (currentAccountId && loading) {
		return <Loading.Page />;
	}

	return (
		<EmptyState
			className="mt-5"
			title={translate('select-an-account-to-view-this-page')}
			type="EMPTY_STATE"
		/>
	);
}
