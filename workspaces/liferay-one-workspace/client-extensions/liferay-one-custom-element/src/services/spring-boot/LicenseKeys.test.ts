/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import {downloadFile} from '~/utils/downloadFileUtils';

import LicenseKeys from './LicenseKeys';

const {oAuth2Fetch} = vi.hoisted(() => ({oAuth2Fetch: vi.fn()}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication: () => Promise.resolve({fetch: oAuth2Fetch}),
	getUserAgentApplication: vi.fn(),
}));

vi.mock('~/utils/downloadFileUtils', () => ({
	downloadFile: vi.fn(),
}));

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), {status: 200});
}

describe('[CLIENT-SPRING-BOOT-LICENSEKEYS] LicenseKeys', () => {
	afterEach(() => {
		oAuth2Fetch.mockReset();
		vi.mocked(downloadFile).mockReset();
	});

	it('checks the free domains with the domains and owner', async () => {
		oAuth2Fetch.mockResolvedValue(new Response(null, {status: 204}));

		await LicenseKeys.licenseKeyTypeFreeDomainsCheck({
			domains: 'example.com',
			owner: 'owner@example.com',
		});

		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/license-keys/type-free-domains-check',
			{
				body: '{"domains":"example.com","owner":"owner@example.com"}',
				method: 'POST',
			}
		);
	});

	it('creates the free key with the domains, order ID, and owner', async () => {
		oAuth2Fetch.mockResolvedValue(jsonResponse({id: 1}));

		await expect(
			LicenseKeys.createLicenseKeyTypeFree({
				domains: 'example.com',
				orderId: '42',
				owner: 'owner@example.com',
			})
		).resolves.toEqual({id: 1});
		expect(oAuth2Fetch).toHaveBeenCalledWith('/license-keys/type-free', {
			body: '{"domains":"example.com","orderId":"42","owner":"owner@example.com"}',
			method: 'POST',
		});
	});

	it('downloads the developer key with every parameter encoded', async () => {
		const response = new Response('key', {status: 200});

		oAuth2Fetch.mockResolvedValue(response);

		await LicenseKeys.downloadDeveloperKey({
			keyType: 'developer cluster',
			name: 'developer.xml',
			productName: 'DXP & Commerce',
			projectExternalReferenceCode: 'PRJCT-1',
			version: '2026.q1',
		});

		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/license-keys/developer-download?keyType=developer+cluster&productName=DXP+%26+Commerce&projectExternalReferenceCode=PRJCT-1&version=2026.q1',
			{earlyReturn: true}
		);
		expect(downloadFile).toHaveBeenCalledWith('developer.xml', response);
	});

	it('downloads the license key with earlyReturn', async () => {
		const response = new Response('key', {status: 200});

		oAuth2Fetch.mockResolvedValue(response);

		await LicenseKeys.downloadLicenseKey('9', 'license.xml');

		expect(oAuth2Fetch).toHaveBeenCalledWith('/license-keys/9/download', {
			earlyReturn: true,
		});
		expect(downloadFile).toHaveBeenCalledWith('license.xml', response);
	});

	it('patches the active flag', async () => {
		oAuth2Fetch.mockResolvedValue(jsonResponse({}));

		await LicenseKeys.updateLicenseKeyActive(false, '9');

		expect(oAuth2Fetch).toHaveBeenCalledWith('/license-keys/9/active', {
			body: '{"active":false}',
			method: 'PATCH',
		});
	});
});
