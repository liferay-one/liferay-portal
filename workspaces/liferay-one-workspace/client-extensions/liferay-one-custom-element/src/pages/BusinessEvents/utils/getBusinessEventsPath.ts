/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

export function getBusinessEventsPath(
	accountERC: string,
	projectERC: string,
	...segments: (number | string)[]
): string {
	return [
		'',
		accountERC,
		'project',
		projectERC,
		'business-events',
		...segments,
	].join('/');
}

export default getBusinessEventsPath;
