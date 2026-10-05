/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';
import {downloadFile} from '~/utils/downloadFileUtils';

import Cloud from './Cloud';

const {oAuth2Fetch} = vi.hoisted(() => ({oAuth2Fetch: vi.fn()}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication: () => Promise.resolve({fetch: oAuth2Fetch}),
	getUserAgentApplication: vi.fn(),
}));

vi.mock('~/utils/downloadFileUtils', () => ({
	downloadFile: vi.fn(),
}));

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {status});
}

async function getError(promise: Promise<unknown>) {
	return promise.then(
		() => {
			throw new Error('Expected a rejection');
		},
		(error) => error
	);
}

describe('[CLIENT-SPRING-BOOT-CLOUD] Cloud', () => {
	afterEach(() => {
		oAuth2Fetch.mockReset();
		vi.mocked(downloadFile).mockReset();
	});

	it('downloads the offline bundle named by environment and version', async () => {
		const response = new Response('zip', {status: 200});

		oAuth2Fetch.mockResolvedValue(response);

		await Cloud.downloadOfflineActivationBundle('2026.q1', 'env-1', [4, 5]);

		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/cloud/environments/env-1/offline-activation-bundle',
			{
				body: '{"dxpVersion":"2026.q1","entitlementIds":[4,5]}',
				earlyReturn: true,
				method: 'POST',
			}
		);
		expect(downloadFile).toHaveBeenCalledWith(
			'env-1-2026.q1-offline-activation-bundle.zip',
			response
		);
	});

	it('gets the entitlements and environments on fixed paths', async () => {
		oAuth2Fetch.mockImplementation(() => Promise.resolve(jsonResponse({})));

		await Cloud.getEnvironmentsEntitlements('env-1');
		await Cloud.getProjectsEntitlementsDisasterRecovery('PRJCT-1');
		await Cloud.getProjectsEnvironmentsActivationCodes('PRJCT-1');
		await Cloud.getProjectsEnvironmentsOffline('PRJCT-1');

		expect(oAuth2Fetch.mock.calls.map(([resource]) => resource)).toEqual([
			'/cloud/environments/env-1/entitlements',
			'/cloud/projects/PRJCT-1/entitlements/disaster-recovery',
			'/cloud/projects/PRJCT-1/environments/activation-codes',
			'/cloud/projects/PRJCT-1/environments/offline',
		]);
	});

	it('parses the activation code result from the JSON body', async () => {
		const activationCode = {
			activationCode: 'CODE',
			activationStatus: 'active',
			environmentId: 'env-1',
			environmentName: 'prod',
			type: 'production',
		};

		oAuth2Fetch.mockResolvedValue(jsonResponse(activationCode));

		await expect(
			Cloud.postProjectsEnvironmentsActivationCodes(
				'PRJCT-1',
				'production'
			)
		).resolves.toEqual(activationCode);
		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/cloud/projects/PRJCT-1/environments/activation-codes',
			{
				body: '{"type":"production"}',
				earlyReturn: true,
				method: 'POST',
			}
		);
	});

	it('parses the environment ID from the offline activation response', async () => {
		oAuth2Fetch.mockResolvedValue(jsonResponse({environmentId: 'env-9'}));

		await expect(Cloud.offlineActivation('CODE', 'TOKEN')).resolves.toBe(
			'env-9'
		);
		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/cloud/environments/offline-activation',
			{
				body: '{"activationCode":"CODE","token":"TOKEN"}',
				earlyReturn: true,
				method: 'POST',
			}
		);
	});

	it('posts the activation request with earlyReturn', async () => {
		oAuth2Fetch.mockResolvedValue(new Response(null, {status: 204}));

		await Cloud.postEnvironmentsActivationRequest(
			'production',
			{hostName: 'host'},
			'PRJCT-1'
		);

		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/cloud/environments/activation-request',
			{
				body: '{"environmentProfile":"production","hostName":"host","projectExternalReferenceCode":"PRJCT-1"}',
				earlyReturn: true,
				method: 'POST',
			}
		);
	});

	it('throws a FetcherError with the status for every non ok earlyReturn post', async () => {
		oAuth2Fetch.mockImplementation(() =>
			Promise.resolve(jsonResponse({title: 'Conflict'}, 409))
		);

		const errors = await Promise.all([
			getError(Cloud.downloadOfflineActivationBundle('2026.q1', 'env-1')),
			getError(Cloud.offlineActivation('CODE', 'TOKEN')),
			getError(
				Cloud.postEnvironmentsActivationRequest('production', {}, 'P')
			),
			getError(
				Cloud.postProjectsEnvironmentsActivationCodes('P', 'production')
			),
		]);

		for (const error of errors) {
			expect(error).toBeInstanceOf(FetcherError);
			expect(error.status).toBe(409);
		}

		expect(downloadFile).not.toHaveBeenCalled();
	});
});
