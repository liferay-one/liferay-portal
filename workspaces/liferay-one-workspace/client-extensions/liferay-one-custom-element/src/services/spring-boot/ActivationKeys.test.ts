/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import {downloadFile} from '~/utils/downloadFileUtils';

import ActivationKeys from './ActivationKeys';

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

describe('[CLIENT-SPRING-BOOT-ACTIVATIONKEYS] ActivationKeys', () => {
	afterEach(() => {
		oAuth2Fetch.mockReset();
		vi.mocked(downloadFile).mockReset();
	});

	it('activates and deactivates by patching the active flag', async () => {
		oAuth2Fetch.mockImplementation(() => Promise.resolve(jsonResponse({})));

		await ActivationKeys.reactivateActivationKey('1');
		await ActivationKeys.deactivateActivationKey('2');

		expect(oAuth2Fetch.mock.calls).toEqual([
			[
				'/activation-keys/1/active',
				{body: '{"active":true}', method: 'PATCH'},
			],
			[
				'/activation-keys/2/active',
				{body: '{"active":false}', method: 'PATCH'},
			],
		]);
	});

	it('adds the renewed key parameter to the generate form only when given', async () => {
		oAuth2Fetch.mockImplementation(() =>
			Promise.resolve(jsonResponse({bundleProducts: [], products: []}))
		);

		await ActivationKeys.getGenerateForm('PRJCT-1');
		await ActivationKeys.getGenerateForm('PRJCT-1', 'KEY-9');

		expect(oAuth2Fetch.mock.calls.map(([resource]) => resource)).toEqual([
			'/activation-keys/generate-form?projectExternalReferenceCode=PRJCT-1',
			'/activation-keys/generate-form?projectExternalReferenceCode=PRJCT-1&renewedActivationKeyExternalReferenceCode=KEY-9',
		]);
	});

	it('defaults the subscription to false when subscribed is missing', async () => {
		oAuth2Fetch.mockResolvedValue(jsonResponse({}));

		await expect(ActivationKeys.getSubscription('7')).resolves.toBe(false);
		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/activation-keys/subscriptions?activationKeyId=7',
			undefined
		);
	});

	it('downloads with earlyReturn and saves the file', async () => {
		const response = new Response('key', {status: 200});

		oAuth2Fetch.mockResolvedValue(response);

		await ActivationKeys.downloadActivationKey('5', 'key.xml');

		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/activation-keys/5/download',
			{
				earlyReturn: true,
			}
		);
		expect(downloadFile).toHaveBeenCalledWith('key.xml', response);
	});

	it('generates, summarizes, subscribes, and unsubscribes on fixed paths', async () => {
		oAuth2Fetch.mockImplementation(() =>
			Promise.resolve(jsonResponse({activationKeyId: 3}))
		);

		await ActivationKeys.generateActivationKey({
			environmentName: 'prod',
		} as Parameters<typeof ActivationKeys.generateActivationKey>[0]);
		await ActivationKeys.getSummary('PRJCT-1');
		await ActivationKeys.subscribe('8');
		await ActivationKeys.unsubscribe('9');

		expect(
			oAuth2Fetch.mock.calls.map(([resource, options]) => [
				resource,
				options?.method,
				options?.body,
			])
		).toEqual([
			['/activation-keys/generate', 'POST', '{"environmentName":"prod"}'],
			[
				'/activation-keys/summary?projectExternalReferenceCode=PRJCT-1',
				undefined,
				undefined,
			],
			[
				'/activation-keys/subscriptions?activationKeyIds=8',
				'PUT',
				undefined,
			],
			[
				'/activation-keys/subscriptions?activationKeyIds=9',
				'DELETE',
				undefined,
			],
		]);
	});

	it('returns the subscribed flag when present', async () => {
		oAuth2Fetch.mockResolvedValue(jsonResponse({subscribed: true}));

		await expect(ActivationKeys.getSubscription('7')).resolves.toBe(true);
	});
});
