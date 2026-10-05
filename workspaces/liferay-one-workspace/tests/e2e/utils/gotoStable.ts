/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page, Response} from '@playwright/test';

export default async function gotoStable(
	page: Page,
	path: string
): Promise<Response | null> {
	try {
		return await page.goto(path, {waitUntil: 'domcontentloaded'});
	}
	catch (error) {
		if (error instanceof Error && error.message.includes('ERR_ABORTED')) {
			return page.goto(path, {waitUntil: 'domcontentloaded'});
		}

		throw error;
	}
}
