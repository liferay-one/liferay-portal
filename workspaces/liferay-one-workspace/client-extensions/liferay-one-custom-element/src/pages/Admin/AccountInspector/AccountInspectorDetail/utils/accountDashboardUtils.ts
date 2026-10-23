/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {getSiteURL} from '~/utils/siteUtils';

import type {Account} from '~/types/accounts';

export function getAccountDashboardURL(account: Account, path = '') {
	return `${getSiteURL()}/my-account#/${encodeURIComponent(
		account.externalReferenceCode
	)}${path ? `/${path}` : ''}`;
}

export function openAccountDashboard(account: Account) {
	window.location.assign(getAccountDashboardURL(account));
}
