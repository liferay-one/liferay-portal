/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useState} from 'react';
import Button from '~/components/Button/Button';
import useAccountDetails from '~/hooks/useAccountDetails';
import useHasAdminPermissions from '~/hooks/useHasAdminPermissions';
import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import Accounts from '~/services/spring-boot/Accounts';

import type FetcherError from '~/services/fetcher/FetcherError';

export default function SyncToJSMButton() {
	const [syncing, setSyncing] = useState(false);

	const {data} = useAccountDetails();
	const {hasAdminPermissions} = useHasAdminPermissions();

	const accountExternalReferenceCode = data?.account?.externalReferenceCode;

	if (!hasAdminPermissions || !accountExternalReferenceCode) {
		return null;
	}

	const handleClick = async () => {
		setSyncing(true);

		try {
			await Accounts.postSyncToJSM(accountExternalReferenceCode);

			Liferay.Util.openToast({
				message: i18n.translate(
					'the-account-was-successfully-synced-to-jsm'
				),
				type: 'success',
			});
		}
		catch (error) {
			const info = (error as FetcherError)?.info;

			Liferay.Util.openToast({
				message:
					info?.detail ??
					info?.title ??
					i18n.translate('an-unexpected-error-occurred'),
				type: 'danger',
			});
		}
		finally {
			setSyncing(false);
		}
	};

	return (
		<Button
			disabled={syncing}
			displayType="secondary"
			isLoading={syncing}
			onClick={handleClick}
			prependIcon="reload"
		>
			{syncing
				? i18n.translate('syncing-to-jsm')
				: i18n.translate('sync-to-jsm')}
		</Button>
	);
}
