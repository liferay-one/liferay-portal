/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {APIRequestContext, expect} from '@playwright/test';

import {SITE_PATH, sitePath} from '../../e2e/utils/environmentUtils';
import {apiTest as test} from '../fixtures/apiTest';

const SITE_EXTERNAL_REFERENCE_CODE = 'LIFERAY_ONE';

function getLocs(xml: string): string[] {
	return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, loc]) =>
		loc.replaceAll('&amp;', '&')
	);
}

async function getSitemapLocs(
	guest: APIRequestContext,
	url: string
): Promise<string[]> {
	const response = await guest.get(url);

	expect(response.ok()).toBeTruthy();

	return getLocs(await response.text());
}

test.describe('[FLOW-SUPPORT-PAGE] support page set', () => {
	let guest: APIRequestContext;

	test.beforeEach(async ({playwright}) => {
		guest = await playwright.request.newContext({
			baseURL: process.env.BASE_URL ?? 'http://localhost:8080',
		});
	});

	test.afterEach(async () => {
		await guest.dispose();
	});

	test('[FLOW-SUPPORT-PAGE] a guest who opens /support is redirected to a child page', async () => {
		const response = await guest.get(sitePath('/support'), {
			maxRedirects: 0,
		});

		expect(response.status()).toBe(302);
		expect(response.headers()['location']).toMatch(
			new RegExp(`${SITE_PATH}/support/[^/?#]+`)
		);

		const childPageResponse = await guest.get(sitePath('/support'));

		expect(childPageResponse.ok()).toBeTruthy();
	});

	test('[FLOW-SUPPORT-PAGE] the sitemap leaves out /support and keeps its child pages', async ({
		api,
	}) => {
		const site = await api.get<{id: number}>(
			`/o/headless-admin-site/v1.0/sites/${SITE_EXTERNAL_REFERENCE_CODE}?fields=id`
		);

		const supportPage = await api.get<{id: number; uuid: string}>(
			`/o/headless-delivery/v1.0/sites/${site.id}/site-pages/support?fields=id,uuid`
		);

		const pageSitemapURLs = await getSitemapLocs(
			guest,
			`/sitemap.xml?groupId=${site.id}&privateLayout=false`
		);

		expect(pageSitemapURLs.length).toBeGreaterThan(0);

		for (const pageSitemapURL of pageSitemapURLs) {
			expect(pageSitemapURL).not.toContain(`p_l_id=${supportPage.id}&`);
		}

		const pageURLs: string[] = [];

		for (const pageSitemapURL of pageSitemapURLs) {
			const {pathname, search} = new URL(pageSitemapURL);

			pageURLs.push(
				...(await getSitemapLocs(guest, `${pathname}${search}`))
			);
		}

		expect(pageURLs.some((url) => /\/support\/[^/]+$/.test(url))).toBe(
			true
		);
		expect(pageURLs.filter((url) => /\/support\/?$/.test(url))).toEqual([]);

		const supportPageLocs = await getSitemapLocs(
			guest,
			`/sitemap.xml?groupId=${site.id}&layoutUuid=${supportPage.uuid}&p_l_id=${supportPage.id}&privateLayout=false`
		);

		expect(supportPageLocs).toEqual([]);
	});
});
