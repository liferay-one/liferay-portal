/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

export function getAIHubEnvironmentExternalReferenceCode(
	ownerExternalReferenceCode: string
) {
	return `AI-HUB-${ownerExternalReferenceCode}`;
}

export function isProvisionedAIHubEnvironment(environment?: {
	externalEnvironmentId?: string;
}) {
	return Number(environment?.externalEnvironmentId) > 0;
}
