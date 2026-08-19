/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {downloadFile} from '~/utils/downloadFile';

import {OneSpringBootOAuth2} from './OAuth2Client';

class CloudOAuth2 extends OneSpringBootOAuth2 {
	async downloadOfflineActivationBundle(
		dxpVersion: string,
		environmentId: string
	) {
		const response = await this.post<Response>(
			`/environments/${environmentId}/offline-activation-bundle`,
			{dxpVersion},
			{earlyReturn: true}
		);

		if (!response.ok) {
			throw new Error(await response.text());
		}

		await downloadFile(
			`${environmentId}-${dxpVersion}-offline-activation-bundle.zip`,
			response
		);
	}

	async offlineActivation(activationCode: string, token: string) {
		const response = await this.post<Response>(
			'/environments/offline-activation',
			{activationCode, token},
			{earlyReturn: true}
		);

		if (!response.ok) {
			throw new Error(await response.text());
		}
	}
}

const Cloud = new CloudOAuth2('/cloud');

export default Cloud;
