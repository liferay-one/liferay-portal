/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

export function getTicketAttachmentsPath(
	accountERC: string,
	projectERC: string
): string {
	return ['', accountERC, 'project', projectERC].join('/');
}

export default getTicketAttachmentsPath;
