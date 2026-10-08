/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it, vi} from 'vitest';

import appPlaceholder from '../assets/images/app_placeholder.png';
import {
	createSkuName,
	getSkuPrice,
	getThumbnailByProductAttachment,
	removeProtocolURL,
	showAppImage,
	submitBase64EncodedFile,
} from './publishUtils';

import type {SKU} from '~/types/product';

vi.mock('./apiUtils', () => ({
	createProductSpecification: vi.fn(),
	getProductSpecifications: vi.fn(),
	getSiteStructuredContentByFriendlyURLPath: vi.fn(),
	getSiteStructuredContentByKey: vi.fn(),
	updateProductSpecification: vi.fn(),
}));

const appLicensePrice = {
	developer: [{key: 1, value: 25}],
	standard: [{key: 1, value: 100}],
};

function toSKU(sku: string, skuOptions: {key: string; value: string}[] = []) {
	return {sku, skuOptions} as SKU;
}

async function submit(file: File) {
	const requestFunction = vi.fn().mockResolvedValue({id: 1});

	await submitBase64EncodedFile({
		appERC: 'APP-ERC',
		file,
		isAppIcon: true,
		requestFunction,
		title: 'Icon',
	});

	return requestFunction.mock.calls[0][0].body.attachment;
}

describe('[MOD-PUBLISHUTILS] publishUtils', () => {
	describe('createSkuName', () => {
		it('strips non alphanumeric characters from the version', () => {
			expect(createSkuName(42, '1.2.3-beta')).toBe('42v123beta');
		});

		it('appends the concat value', () => {
			expect(createSkuName(42, '2.0', 'ts')).toBe('42v20ts');
		});
	});

	describe('getSkuPrice', () => {
		it('returns 0 for a trial SKU without a license usage option', () => {
			expect(getSkuPrice(appLicensePrice, toSKU('42v10ts'))).toBe(0);
		});

		it('returns the developer or standard price by suffix', () => {
			expect(getSkuPrice(appLicensePrice, toSKU('42v10d'))).toBe(25);
			expect(getSkuPrice(appLicensePrice, toSKU('42v10s'))).toBe(100);
		});

		it('returns 0 when the tier has no price', () => {
			expect(
				getSkuPrice({developer: [], standard: []}, toSKU('42v10s'))
			).toBe(0);
		});

		it('returns the price by license usage option value', () => {
			expect(
				getSkuPrice(
					appLicensePrice,
					toSKU('42v10ts', [
						{key: 'base-license-usage-type', value: 'standard'},
					])
				)
			).toBe(100);
			expect(
				getSkuPrice(
					appLicensePrice,
					toSKU('42v10', [
						{key: 'base-license-usage-type', value: 'developer'},
					])
				)
			).toBe(25);
		});

		it('returns 0 for any other license usage option value', () => {
			expect(
				getSkuPrice(
					appLicensePrice,
					toSKU('42v10s', [
						{key: 'base-license-usage-type', value: 'trial'},
					])
				)
			).toBe(0);
		});
	});

	describe('getThumbnailByProductAttachment', () => {
		it('prefers the attachment tagged as the app icon', () => {
			expect(
				getThumbnailByProductAttachment([
					{src: '/first.png', tags: []},
					{src: '/icon.png', tags: ['app-icon']},
				])
			).toBe('/icon.png');
		});

		it('falls back to the first image', () => {
			expect(
				getThumbnailByProductAttachment([
					{src: '/first.png'},
					{src: '/second.png'},
				])
			).toBe('/first.png');
		});

		it('returns undefined without images', () => {
			expect(getThumbnailByProductAttachment(undefined)).toBeUndefined();
			expect(getThumbnailByProductAttachment([])).toBeUndefined();
		});
	});

	describe('showAppImage', () => {
		it('rewrites the image to the current origin', () => {
			expect(
				showAppImage('https://cdn.example.com/documents/1/icon.png?x=1')
			).toBe(`${window.location.origin}/documents/1/icon.png`);
		});

		it('falls back to the placeholder for default images or no URL', () => {
			expect(showAppImage('https://cdn.example.com/image/default')).toBe(
				appPlaceholder
			);
			expect(showAppImage()).toBe(appPlaceholder);
		});
	});

	describe('removeProtocolURL', () => {
		it('strips the protocol, www, and path', () => {
			expect(removeProtocolURL('https://www.liferay.com/contact')).toBe(
				'liferay.com'
			);
			expect(removeProtocolURL('HTTP://example.com')).toBe('example.com');
			expect(removeProtocolURL('example.com/a/b')).toBe('example.com');
		});
	});

	describe('submitBase64EncodedFile', () => {
		it('strips the data URL prefix per MIME type', async () => {
			for (const type of [
				'application/java-archive',
				'application/octet-stream',
				'application/zip',
				'image/gif',
				'image/jpeg',
				'image/png',
			]) {
				expect(await submit(new File(['hello'], 'file', {type}))).toBe(
					btoa('hello')
				);
			}
		});

		it('sends the attachment with the app icon settings', async () => {
			const requestFunction = vi.fn().mockResolvedValue({id: 7});

			const response = await submitBase64EncodedFile({
				appERC: 'APP-ERC',
				file: new File(['hello'], 'icon.png', {type: 'image/png'}),
				index: 2,
				isAppIcon: true,
				requestFunction,
				title: 'Icon',
			});

			expect(response).toEqual({id: 7});
			expect(requestFunction).toHaveBeenCalledWith({
				body: {
					attachment: btoa('hello'),
					galleryEnabled: false,
					neverExpire: true,
					priority: 2,
					tags: ['app icon'],
					title: {en_US: 'Icon'},
				},
				callback: undefined,
				externalReferenceCode: 'APP-ERC',
			});
		});
	});
});
