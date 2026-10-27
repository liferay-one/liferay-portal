/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Accounts from '~/services/spring-boot/Accounts';

import type {SalesforceRecords} from '~/types/accountInspection';
import type {DataQuery} from '~/types/api';

export function accountSalesforceRecordsQuery(
	accountExternalReferenceCode: string | undefined,
	loadedAt: number
): DataQuery<SalesforceRecords> {
	return {
		fetcher: () =>
			Accounts.getSalesforceRecords(accountExternalReferenceCode!),
		key: accountExternalReferenceCode
			? `/account-inspection/${accountExternalReferenceCode}/salesforce-records/${loadedAt}`
			: null,
	};
}
