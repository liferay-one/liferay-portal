/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import EmptyState from '~/components/EmptyState/EmptyState';
import Loading from '~/components/Loading/Loading';
import Page from '~/components/Page/Page';
import {useOneContext} from '~/context/OneContextProvider';
import i18n from '~/i18n';
import JSMSync from '~/pages/MyAccount/AccountAdmin/components/JSMSync/JSMSync';
import LicensingSettings from '~/pages/MyAccount/AccountAdmin/components/LicensingSettings/LicensingSettings';

export default function AccountAdmin() {
	const {myUserAccount, userAccountModel} = useOneContext();

	if (!myUserAccount) {
		return <Loading className="my-4" />;
	}

	if (!userAccountModel?.canViewAccountAdmin) {
		return (
			<Page>
				<EmptyState
					className="mt-5"
					title={i18n.translate(
						'you-do-not-have-access-to-this-page'
					)}
					type="NO_ACCESS"
				/>
			</Page>
		);
	}

	return (
		<Page>
			<JSMSync />

			<LicensingSettings />
		</Page>
	);
}
