/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {downloadFile} from '~/utils/downloadFile';

import {OneSpringBootOAuth2} from './OAuth2Client';

class CloudNativeEnvironmentsOAuth2 extends OneSpringBootOAuth2 {
	async downloadOfflineActivationBundle(
		environmentId: string,
		dxpVersion: string
	) {
		const response = await this.post<Response>(
			'/offline-activation-bundle',
			{dxpVersion, environmentId},
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
			'/offline-activation',
			{activationCode, token},
			{earlyReturn: true}
		);

		if (!response.ok) {
			throw new Error(await response.text());
		}
	}
}

const CloudNativeEnvironments = new CloudNativeEnvironmentsOAuth2(
	'/cloud-native-environments'
);

export default CloudNativeEnvironments;
