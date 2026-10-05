/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page, expect} from '@playwright/test';

import gotoStable from './gotoStable';

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]';

export async function expectCustomElementRenders(
	page: Page,
	path: string,
	{timeout = 30000}: {timeout?: number} = {}
): Promise<void> {
	const customElements = page.locator('liferay-one-custom-element');

	await expect(
		customElements.first(),
		`expected the custom element to mount at ${path}`
	).toBeAttached({timeout});

	await expect
		.poll(
			async () => {
				const count = await customElements.count();

				for (let index = 0; index < count; index++) {
					const element = customElements.nth(index);

					const heading = element.locator(HEADING_SELECTOR).first();

					if (await heading.isVisible().catch(() => false)) {
						return true;
					}

					const text = (
						await element.innerText().catch(() => '')
					).trim();

					if (text.length) {
						return true;
					}
				}

				return page
					.getByText(/restricted/i)
					.first()
					.isVisible()
					.catch(() => false);
			},
			{
				message: `expected the SPA to render a first header or visible content at ${path}`,
				timeout,
			}
		)
		.toBe(true);
}

export async function gotoAndExpectRender(
	page: Page,
	path: string,
	options?: {timeout?: number}
): Promise<void> {
	await gotoStable(page, path);

	await expectCustomElementRenders(page, path, options);
}
