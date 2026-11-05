/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, oneTest as test} from '../fixtures/oneTest';
import {sitePath} from '../utils/environmentUtils';

const APPLICATIONS_PATH = sitePath('/marketplace/applications');

test.describe('[FLOW-MARKETPLACE-CATALOG] marketplace catalog', () => {
	test('[FLOW-MARKETPLACE-CATALOG] the area filter shows an ampersand in a category name once', async ({
		page,
	}) => {
		await page.goto(APPLICATIONS_PATH);

		const labels = page.locator('.facet-value .custom-control-label-text');

		await expect(
			labels.filter({hasText: 'Collaboration & Knowledge Sharing'})
		).not.toHaveCount(0);

		await expect(labels.filter({hasText: '&amp;'})).toHaveCount(0);
	});
});
