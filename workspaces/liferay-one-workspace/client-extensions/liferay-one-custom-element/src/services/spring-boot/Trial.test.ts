/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

import Trial from './Trial';

const {oAuth2Fetch} = vi.hoisted(() => ({oAuth2Fetch: vi.fn()}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication: () => Promise.resolve({fetch: oAuth2Fetch}),
	getUserAgentApplication: vi.fn(),
}));

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), {status: 200});
}

describe('[CLIENT-SPRING-BOOT-TRIAL] Trial', () => {
	afterEach(() => {
		oAuth2Fetch.mockReset();
	});

	it('calls fixed paths for domain availability, delete, expire, extend, and provisioning', async () => {
		oAuth2Fetch.mockImplementation(() => Promise.resolve(jsonResponse({})));

		await Trial.checkDomainAvailability('PRJCT-1');
		await Trial.deleteTrial(11);
		await Trial.expireTrial(12);
		await Trial.extendTrial(13);
		await Trial.provisioningTrial(14);

		expect(
			oAuth2Fetch.mock.calls.map(([resource, options]) => [
				resource,
				options?.method,
			])
		).toEqual([
			['/trial/domain-availability/PRJCT-1', undefined],
			['/trial/11', 'DELETE'],
			['/trial/expire/12', 'POST'],
			['/trial/extend/13', 'POST'],
			['/trial/provisioning/14', 'POST'],
		]);
	});

	it('returns the availability from the service', async () => {
		const availability = {
			active: true,
			available: 3,
			fallback: false,
			max: 5,
		};

		oAuth2Fetch.mockResolvedValue(jsonResponse(availability));

		await expect(Trial.getAvailability()).resolves.toEqual(availability);
		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/trial/availability',
			undefined
		);
	});

	it('returns the fallback availability when the request fails', async () => {
		oAuth2Fetch.mockRejectedValue(new Error('Network down'));

		await expect(Trial.getAvailability()).resolves.toEqual({
			active: false,
			available: 0,
			fallback: true,
			max: 0,
		});
	});
});
