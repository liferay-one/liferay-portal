/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import Accounts from '~/services/spring-boot/Accounts';

import type FetcherError from '~/services/fetcher/FetcherError';

async function syncAccountFromSalesforce(accountExternalReferenceCode: string) {
	try {
		const {count} = await Accounts.postSyncFromSalesforce(
			accountExternalReferenceCode
		);

		Liferay.Util.openToast({
			message: count
				? i18n.sub(
						'x-records-were-synced-from-salesforce',
						String(count)
					)
				: i18n.translate('the-account-already-matches-salesforce'),
			type: 'success',
		});

		return true;
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

		return false;
	}
}

export default syncAccountFromSalesforce;
