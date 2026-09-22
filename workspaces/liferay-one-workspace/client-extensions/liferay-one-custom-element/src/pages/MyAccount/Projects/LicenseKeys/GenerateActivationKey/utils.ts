/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Word} from '~/i18n';

import type {GenerateActivationKeyServer} from './types';

const DEVELOPER_KEY_TYPE_SUFFIX = 'Development';

export function buildEmptyServer(): GenerateActivationKeyServer {
	return {hostName: '', ipAddresses: '', macAddresses: ''};
}

export function getGenerateButtonLabel(
	renewing: boolean,
	serverCount: number
): Word {
	if (renewing) {
		return serverCount === 1 ? 'renew-x-key' : 'renew-x-keys';
	}

	return serverCount === 1 ? 'generate-x-key' : 'generate-x-keys';
}

export function isDeveloperKeyType(keyType: string): boolean {
	return keyType.endsWith(DEVELOPER_KEY_TYPE_SUFFIX);
}

export function hasServerInfo(servers: GenerateActivationKeyServer[]): boolean {
	return servers.every(
		(server) =>
			Boolean(server.hostName.trim()) ||
			Boolean(server.ipAddresses.trim()) ||
			Boolean(server.macAddresses.trim())
	);
}
