/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, oneTest as test} from '../fixtures/oneTest';
import {sitePath} from '../utils/environmentUtils';

const APPLICATIONS_PATH = sitePath('/marketplace/applications');

const APP_PATH = sitePath('/p/liferay-commerce-connector-to-ups');

const WIDE_IMAGE_URL =
	'data:image/svg+xml,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" height="900" width="3000"></svg>'
	);

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

	test('[FLOW-MARKETPLACE-CATALOG] an app page renders with no template error', async ({
		page,
	}) => {
		await page.goto(APP_PATH);

		await expect(
			page.locator('.marketplace-description-content')
		).toBeVisible();

		await expect(page.locator('.template-error')).toHaveCount(0);
	});

	test('[FLOW-MARKETPLACE-CATALOG] a wide gallery image stays inside its column', async ({
		page,
	}) => {
		await page.setViewportSize({height: 900, width: 1280});

		await page.goto(APP_PATH);

		const image = page.locator('#main-image');

		await image.evaluate((element: HTMLImageElement, url: string) => {
			element.src = url;
		}, WIDE_IMAGE_URL);

		const imageBox = await image.boundingBox();
		const wrapperBox = await page
			.locator('.main-image-wrapper')
			.boundingBox();
		const columnBox = await page
			.locator('.main-image-wrapper')
			.locator('xpath=ancestor::*[contains(@class, "col-")][1]')
			.boundingBox();

		expect(wrapperBox!.x + wrapperBox!.width).toBeLessThanOrEqual(
			columnBox!.x + columnBox!.width
		);
		expect(imageBox!.x + imageBox!.width).toBeLessThanOrEqual(
			columnBox!.x + columnBox!.width
		);
	});
});
