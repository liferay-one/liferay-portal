/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page, expect} from '@playwright/test';

import HeadlessAPI, {HeadlessPage} from './HeadlessAPI';
import {gotoAndExpectRender} from './customElementUtils';
import {SITE_PATH, sitePath} from './environmentUtils';

export const NEW_APP_DRAFT_STORAGE_KEY = 'marketplace:new-app-flow-draft';

export const PUBLISHER_DASHBOARD_PATH = sitePath(
	'/my-account/publisher-dashboard'
);

/**
 * Opens a Publisher Dashboard route. `route` is the hash path without the
 * leading `#/`, such as `published-apps`.
 */

export async function gotoPublisherDashboard(
	page: Page,
	route: string
): Promise<void> {
	await gotoAndExpectRender(page, `${PUBLISHER_DASHBOARD_PATH}#/${route}`);
}

/**
 * A 1 by 1 PNG, small enough for every image dropzone in the publish flows.
 */

export const PNG_FILE = {
	buffer: Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
		'base64'
	),
	mimeType: 'image/png',
	name: 'e2e-image.png',
};

/**
 * An empty ZIP archive, which the app build step accepts as a package.
 */

export const ZIP_FILE = {
	buffer: Buffer.from('504b0506000000000000000000000000000000000000', 'hex'),
	mimeType: 'application/zip',
	name: 'e2e-package.zip',
};

/**
 * Finds the catalog products named exactly `productName`. The admin catalog
 * finds a product by `search`, which reads the search index, and a product
 * submitted moments ago may not be indexed yet. When the journey reached a
 * successful submission, the lookup therefore polls until the product appears
 * and fails if it never does, so a submitted product cannot leak silently.
 */

async function findProductsByName(
	adminAPI: HeadlessAPI,
	productName: string,
	{submitted}: {submitted: boolean}
): Promise<Array<{productId: number}>> {
	const search = async () => {
		const {items} = await adminAPI.get<{
			items: Array<{name: {en_US: string}; productId: number}>;
		}>(
			`/o/headless-commerce-admin-catalog/v1.0/products?search=${encodeURIComponent(
				productName
			)}&pageSize=20`
		);

		return items.filter(({name}) => name.en_US === productName);
	};

	if (!submitted) {
		return search();
	}

	let products: Array<{productId: number}> = [];

	await expect
		.poll(
			async () => {
				products = await search();

				return products.length;
			},
			{
				message: `Unable to find the submitted product ${productName} to delete it`,
				timeout: 60000,
			}
		)
		.toBeGreaterThan(0);

	return products;
}

/**
 * Deletes every publisher account request whose description matches, which
 * is how a test finds the requests it submitted through the browser. The value
 * is quoted as an OData string literal, so a quote in it cannot change the
 * filter, and every page of matches is read.
 */

export async function deletePublisherAccountRequests(
	adminAPI: HeadlessAPI,
	requestDescription: string
): Promise<void> {
	const filter = `requestDescription eq '${requestDescription.replace(
		/'/g,
		"''"
	)}'`;

	const ids: number[] = [];

	for (let page = 1; ; page++) {
		const {items, lastPage} = await adminAPI.get<
			HeadlessPage<{id: number}>
		>(
			`/o/c/publisheraccountrequests?filter=${encodeURIComponent(
				filter
			)}&page=${page}&pageSize=100`
		);

		ids.push(...items.map(({id}) => id));

		if (!lastPage || page >= lastPage) {
			break;
		}
	}

	for (const id of ids) {
		await adminAPI.deleteIfExists(`/o/c/publisheraccountrequests/${id}`);
	}
}

/**
 * Removes a product a publish flow submitted, with every record the
 * submission created beside it: the publisher assets and their attachments,
 * and the Documents and Media folder that holds the uploaded packages.
 */

export async function deleteSubmittedProduct(
	adminAPI: HeadlessAPI,
	productName: string,
	{submitted}: {submitted: boolean}
): Promise<void> {
	const products = await findProductsByName(adminAPI, productName, {
		submitted,
	});

	const {id: siteId} = await adminAPI.get<{id: number}>(
		`/o/headless-admin-user/v1.0/sites/by-friendly-url-path/${SITE_PATH.split(
			'/'
		).pop()}`
	);

	for (const {productId} of products) {
		const {items: publisherAssets} = await adminAPI.get<{
			items: Array<{id: number}>;
		}>(
			`/o/c/publisherassets?filter=${encodeURIComponent(
				`r_productEntryToPublisherAsset_CProductId eq '${productId}'`
			)}&pageSize=50`
		);

		for (const publisherAsset of publisherAssets) {
			const {items: attachments} = await adminAPI.get<{
				items: Array<{id: number}>;
			}>(
				`/o/c/publisherassetattachments?filter=${encodeURIComponent(
					`r_publisherAssetToAttachment_c_publisherAssetId eq '${publisherAsset.id}'`
				)}&pageSize=50`
			);

			for (const attachment of attachments) {
				await adminAPI.deleteIfExists(
					`/o/c/publisherassetattachments/${attachment.id}`
				);
			}

			await adminAPI.deleteIfExists(
				`/o/c/publisherassets/${publisherAsset.id}`
			);
		}

		const {items: folders} = await adminAPI.get<{
			items: Array<{id: number}>;
		}>(
			`/o/headless-delivery/v1.0/sites/${siteId}/document-folders?flatten=true&filter=${encodeURIComponent(
				`name eq 'app_${productId}'`
			)}`
		);

		for (const folder of folders) {
			await adminAPI.deleteIfExists(
				`/o/headless-delivery/v1.0/document-folders/${folder.id}`
			);
		}

		await adminAPI.deleteIfExists(
			`/o/headless-commerce-admin-catalog/v1.0/products/${productId}`
		);
	}
}

/**
 * Picks the first suggestion of a Clay multiselect, such as the Area and Tags
 * fields of the publish flows.
 */

export async function pickFirstMultiSelectOption(
	page: Page,
	name: string
): Promise<void> {
	await page.getByRole('combobox', {exact: true, name}).click();

	await page.getByRole('option').first().click();
}
