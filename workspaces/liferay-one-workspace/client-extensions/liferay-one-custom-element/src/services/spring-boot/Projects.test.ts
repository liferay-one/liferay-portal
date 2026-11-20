/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';
import {downloadFile} from '~/utils/downloadFileUtils';

import Projects from './Projects';

const {oAuth2Fetch} = vi.hoisted(() => ({oAuth2Fetch: vi.fn()}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication: () => Promise.resolve({fetch: oAuth2Fetch}),
	getUserAgentApplication: vi.fn(),
}));

vi.mock('~/utils/downloadFileUtils', () => ({
	downloadFile: vi.fn(),
}));

async function getError(promise: Promise<unknown>) {
	return promise.then(
		() => {
			throw new Error('Expected a rejection');
		},
		(error) => error
	);
}

describe('[CLIENT-SPRING-BOOT-PROJECTS] Projects', () => {
	afterEach(() => {
		oAuth2Fetch.mockReset();
		vi.mocked(downloadFile).mockReset();
	});

	it('gets the DXP activation codes of the project', async () => {
		oAuth2Fetch.mockResolvedValue(
			new Response(JSON.stringify({environmentTypes: []}))
		);

		await expect(
			Projects.getDXPActivationCodes('PRJCT-1')
		).resolves.toEqual({environmentTypes: []});

		expect(oAuth2Fetch.mock.calls[0][0]).toBe(
			'/projects/PRJCT-1/dxp/activation-codes'
		);
	});

	it('patches the active flag of a DXP environment', async () => {
		oAuth2Fetch.mockResolvedValue(new Response(null, {status: 204}));

		await Projects.patchDXPEnvironmentActive('PRJCT-1', 'ENV-1', false);

		expect(oAuth2Fetch.mock.calls[0][0]).toBe(
			'/projects/PRJCT-1/dxp/environments/ENV-1/active'
		);
		expect(oAuth2Fetch.mock.calls[0][1]).toMatchObject({
			body: '{"active":false}',
			method: 'PATCH',
		});
	});

	it('posts the type and parses the generated DXP activation code', async () => {
		const activationCode = {
			activationCode: 'CODE',
			activationMode: '',
			activationStatus: 'pending',
			environmentId: 'ENV-1',
			installationId: '',
			type: 'backup',
		};

		oAuth2Fetch.mockResolvedValue(
			new Response(JSON.stringify(activationCode))
		);

		await expect(
			Projects.postDXPActivationCodes('PRJCT-1', 'backup')
		).resolves.toEqual(activationCode);

		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/projects/PRJCT-1/dxp/activation-codes',
			{body: '{"type":"backup"}', earlyReturn: true, method: 'POST'}
		);
	});

	it('downloads the DXP offline bundle for the activation token', async () => {
		const response = new Response('zip', {status: 200});

		oAuth2Fetch.mockResolvedValue(response);

		await Projects.downloadDXPOfflineActivationBundle(
			'PRJCT-1',
			'CODE',
			'TOKEN',
			'2027.Q1'
		);

		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/projects/PRJCT-1/dxp/offline-activation-bundle',
			{
				body: JSON.stringify({
					activationCode: 'CODE',
					activationToken: 'TOKEN',
					dxpVersion: '2027.Q1',
				}),
				earlyReturn: true,
				method: 'POST',
			}
		);
		expect(downloadFile).toHaveBeenCalledWith(
			'2027.Q1-activation.zip',
			response
		);
	});

	it('throws a FetcherError with the status when a DXP request fails', async () => {
		oAuth2Fetch.mockImplementation(() =>
			Promise.resolve(new Response('', {status: 409}))
		);

		const downloadError = await getError(
			Projects.downloadDXPOfflineActivationBundle(
				'PRJCT-1',
				'CODE',
				'TOKEN',
				'2027.Q1'
			)
		);

		expect(downloadError).toBeInstanceOf(FetcherError);
		expect(downloadError.status).toBe(409);
		expect(downloadFile).not.toHaveBeenCalled();

		oAuth2Fetch.mockImplementation(() =>
			Promise.resolve(new Response('', {status: 422}))
		);

		const postError = await getError(
			Projects.postDXPActivationCodes('PRJCT-1', 'production')
		);

		expect(postError).toBeInstanceOf(FetcherError);
		expect(postError.status).toBe(422);
	});
});
