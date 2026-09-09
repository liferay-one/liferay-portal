/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {OneSpringBootOAuth2} from './OAuth2Client';

class EntitlementDefinitionsOAuth2 extends OneSpringBootOAuth2 {
	async generate(cProductId: number) {
		await this.post(`/generate?cProductId=${cProductId}`);
	}
}

const EntitlementDefinitions = new EntitlementDefinitionsOAuth2(
	'/entitlement-definitions'
);

export default EntitlementDefinitions;
