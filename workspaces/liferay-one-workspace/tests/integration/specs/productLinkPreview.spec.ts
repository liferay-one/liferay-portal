/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

import {sitePath} from '../../e2e/utils/environmentUtils';

const PRODUCTS = [
	{
		displayPageTemplate: 'app-detail',
		friendlyURL: 'minium-theme',
		name: 'Minium Theme',
	},
	{
		displayPageTemplate: 'cms-product-details',
		friendlyURL: 'liferay-cms',
		name: 'Liferay CMS',
	},
	{
		displayPageTemplate: 'hubspot',
		friendlyURL: 'hubspot-lead-capture',
		name: 'Hubspot Lead Capture',
	},
];

function getMetaContent(html: string, property: string): string | undefined {
	const match = html.match(
		new RegExp(`<meta property="${property}" content="([^"]*)"`)
	);

	return match?.[1];
}

test.describe('[FLOW-PRODUCT-LINK-PREVIEW] product page link preview', () => {
	for (const product of PRODUCTS) {
		test(`[FLOW-PRODUCT-LINK-PREVIEW] a guest gets the product name and icon on the ${product.displayPageTemplate} display page`, async ({
			request,
		}) => {
			const response = await request.get(
				sitePath(`/p/${product.friendlyURL}`)
			);

			expect(response.ok()).toBeTruthy();

			const html = await response.text();

			expect(getMetaContent(html, 'og:title')).toBe(product.name);
			expect(getMetaContent(html, 'og:image:alt')).toBe(product.name);

			const imageURL = getMetaContent(html, 'og:image');

			expect(imageURL).toMatch(/^https?:\/\/\S+\/o\/commerce-media\//);

			const imageResponse = await request.get(imageURL!);

			expect(imageResponse.ok()).toBeTruthy();
			expect(imageResponse.headers()['content-type']).toMatch(/^image\//);
		});
	}
});
