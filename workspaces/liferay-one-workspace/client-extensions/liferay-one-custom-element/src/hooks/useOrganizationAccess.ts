/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useOneContext} from '~/context/OneContextProvider';
import {useCurrentAccount} from '~/hooks/useAccounts';

export function useOrganizationAccess() {
	const {userAccountModel} = useOneContext();

	const {data: currentAccount, isLoading: loading} = useCurrentAccount();

	const organizationAccess = Boolean(
		currentAccount &&
			!userAccountModel?.isAccountMember &&
			userAccountModel?.isOrganizationMember(
				currentAccount.organizationIds
			)
	);

	return {
		accountExternalReferenceCode: organizationAccess
			? currentAccount?.externalReferenceCode
			: undefined,
		loading,
		organizationAccess,
	};
}
