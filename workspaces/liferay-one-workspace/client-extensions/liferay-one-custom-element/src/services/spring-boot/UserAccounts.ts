/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {OneSpringBootOAuth2} from './OAuth2Client';

class UserAccountsOAuth2 extends OneSpringBootOAuth2 {
	async postSyncToJSM(userId: number) {
		return this.post(`/${userId}/sync-to-jsm`);
	}
}

const UserAccounts = new UserAccountsOAuth2('/user-accounts');

export default UserAccounts;
