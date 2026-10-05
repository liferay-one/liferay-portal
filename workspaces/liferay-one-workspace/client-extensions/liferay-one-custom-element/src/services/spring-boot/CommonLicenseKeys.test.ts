/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';
import {downloadBlob} from '~/utils/downloadFileUtils';

import CommonLicenseKeys from './CommonLicenseKeys';

const {oAuth2Fetch} = vi.hoisted(() => ({oAuth2Fetch: vi.fn()}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication: () => Promise.resolve({fetch: oAuth2Fetch}),
	getUserAgentApplication: vi.fn(),
}));

vi.mock('~/utils/downloadFileUtils', () => ({
	downloadBlob: vi.fn(),
}));

describe('[CLIENT-SPRING-BOOT-COMMONLICENSEKEYS] CommonLicenseKeys', () => {
	afterEach(() => {
		oAuth2Fetch.mockReset();
		vi.mocked(downloadBlob).mockReset();
	});

	it('deletes by ID', async () => {
		oAuth2Fetch.mockResolvedValue(new Response(null, {status: 204}));

		await CommonLicenseKeys.deleteCommonLicenseKey(3);

		expect(oAuth2Fetch).toHaveBeenCalledWith('/common-license-keys/3', {
			method: 'DELETE',
		});
	});

	it('downloads the blob with earlyReturn', async () => {
		oAuth2Fetch.mockResolvedValue(new Response('license', {status: 200}));

		await CommonLicenseKeys.downloadCommonLicenseKey('license.xml', 4);

		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/common-license-keys/4/download',
			{earlyReturn: true}
		);
		expect(downloadBlob).toHaveBeenCalledWith(
			'license.xml',
			expect.any(Blob)
		);
	});

	it('lists with page, pageSize, and productGroup', async () => {
		oAuth2Fetch.mockResolvedValue(
			new Response(JSON.stringify({items: []}), {status: 200})
		);

		await expect(
			CommonLicenseKeys.getCommonLicenseKeys({
				page: 2,
				pageSize: 20,
				productGroup: 'COMMERCE',
			})
		).resolves.toEqual({items: []});
		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/common-license-keys?page=2&pageSize=20&productGroup=COMMERCE',
			undefined
		);
	});

	it('throws the parsed error before saving the blob on a non ok download', async () => {
		oAuth2Fetch.mockResolvedValue(
			new Response(JSON.stringify({title: 'Not found'}), {status: 404})
		);

		const error = await CommonLicenseKeys.downloadCommonLicenseKey(
			'license.xml',
			4
		).catch((caughtError) => caughtError);

		expect(error).toBeInstanceOf(FetcherError);
		expect(error.info).toEqual({title: 'Not found'});
		expect(error.status).toBe(404);
		expect(downloadBlob).not.toHaveBeenCalled();
	});

	it('uploads a multipart form with the group and every file', async () => {
		oAuth2Fetch.mockResolvedValue(
			new Response(JSON.stringify({}), {status: 200})
		);

		const firstFile = new File(['a'], 'a.xml');
		const secondFile = new File(['b'], 'b.xml');

		await CommonLicenseKeys.uploadCommonLicenseKeys('ENTERPRISE_SEARCH', [
			firstFile,
			secondFile,
		]);

		const [resource, options] = oAuth2Fetch.mock.calls[0];

		expect(resource).toBe('/common-license-keys');
		expect(options.method).toBe('POST');
		expect(options.body).toBeInstanceOf(FormData);
		expect(options.body.get('productGroup')).toBe('ENTERPRISE_SEARCH');
		expect(
			options.body.getAll('files').map((file: File) => file.name)
		).toEqual(['a.xml', 'b.xml']);
	});
});
