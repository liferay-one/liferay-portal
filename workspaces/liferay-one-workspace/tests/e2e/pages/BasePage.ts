/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import gotoStable from '../utils/gotoStable';

export abstract class BasePage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	abstract goto(): Promise<void>;

	protected async navigateTo(path: string): Promise<void> {
		await gotoStable(this.page, path);
	}
}
