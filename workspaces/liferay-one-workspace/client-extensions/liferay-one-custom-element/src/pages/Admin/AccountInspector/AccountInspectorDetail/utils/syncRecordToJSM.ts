/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import Accounts from '~/services/spring-boot/Accounts';
import Projects from '~/services/spring-boot/Projects';
import UserAccounts from '~/services/spring-boot/UserAccounts';

import type FetcherError from '~/services/fetcher/FetcherError';
import type {JSMRecord} from '~/types/accountInspection';

type JSMSyncTarget = Pick<
	JSMRecord,
	'externalReferenceCode' | 'name' | 'recordId' | 'type'
>;

function postSyncToJSM({externalReferenceCode, recordId, type}: JSMSyncTarget) {
	if (type === 'user') {
		return UserAccounts.postSyncToJSM(recordId);
	}

	const sync = type === 'account' ? Accounts : Projects;

	return sync.postSyncToJSM(externalReferenceCode!);
}

async function syncRecordToJSM(target: JSMSyncTarget) {
	try {
		await postSyncToJSM(target);

		Liferay.Util.openToast({
			message: i18n.sub('x-was-synced-to-jsm', target.name),
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

export default syncRecordToJSM;
