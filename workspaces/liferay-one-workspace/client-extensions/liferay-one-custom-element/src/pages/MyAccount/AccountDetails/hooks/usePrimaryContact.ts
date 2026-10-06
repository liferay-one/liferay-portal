/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import {getPrimaryContact} from '~/pages/MyAccount/AccountMembers/accountRoles';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {Liferay} from '~/services/liferay/liferay';

const usePrimaryContact = () => {
	const accountId = Liferay.CommerceContext.account?.accountId;

	return useSWR(
		accountId ? `/account-details/${accountId}/primary-contact` : null,
		async () => {
			const {items} = await HeadlessAdminUser.getUserAccountsByAccountId(
				accountId!,
				new URLSearchParams({pageSize: '-1'})
			);

			return getPrimaryContact(Number(accountId), items);
		}
	);
};

export default usePrimaryContact;
