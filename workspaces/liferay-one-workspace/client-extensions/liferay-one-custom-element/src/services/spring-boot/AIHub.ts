/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {OneSpringBootOAuth2} from './OAuth2Client';

class AIHubOAuth2 extends OneSpringBootOAuth2 {
	async postOpportunities(orderId: number | string): Promise<void> {
		await this.post(`/opportunities/${orderId}`);
	}
}

const AIHub = new AIHubOAuth2('/ai-hub');

export default AIHub;
