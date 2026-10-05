/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const APPLICATION_URL =
	'/o/oauth2/application?externalReferenceCode=liferay-one-etc-spring-boot-oaua';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {status});
}

async function loadInvitations() {
	vi.resetModules();

	const {default: invitations} = await import('./Invitations');

	return invitations;
}

describe('[CLIENT-SPRING-BOOT-INVITATIONS] Invitations', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		fetchMock.mockReset();

		vi.unstubAllGlobals();
	});

	it('accepts with the URI encoded token against the home page URL without the trailing slash', async () => {
		const signal = new AbortController().signal;

		fetchMock
			.mockResolvedValueOnce(
				jsonResponse({homePageURL: 'https://spring.example.com/'})
			)
			.mockResolvedValueOnce(jsonResponse({status: 'accepted'}));

		const invitations = await loadInvitations();

		await expect(invitations.getAccept('a b&c', signal)).resolves.toEqual({
			status: 'accepted',
		});
		expect(fetchMock.mock.calls).toEqual([
			[APPLICATION_URL, {signal}],
			[
				'https://spring.example.com/invitations/accept?token=a%20b%26c',
				{signal},
			],
		]);
	});

	it('clears the cached base URL after a failed lookup', async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse({}, 503))
			.mockResolvedValueOnce(
				jsonResponse({homePageURL: 'https://spring.example.com'})
			)
			.mockResolvedValueOnce(jsonResponse({status: 'accepted'}));

		const invitations = await loadInvitations();

		await expect(invitations.getAccept('token')).rejects.toThrow(
			'Unable to resolve the invitation service: 503'
		);
		await expect(invitations.getAccept('token')).resolves.toEqual({
			status: 'accepted',
		});
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('resolves the base URL once and reuses it', async () => {
		fetchMock
			.mockResolvedValueOnce(
				jsonResponse({homePageURL: 'https://spring.example.com'})
			)
			.mockImplementation(() =>
				Promise.resolve(jsonResponse({status: 'accepted'}))
			);

		const invitations = await loadInvitations();

		await invitations.getAccept('first');
		await invitations.getAccept('second');

		expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
			APPLICATION_URL,
			'https://spring.example.com/invitations/accept?token=first',
			'https://spring.example.com/invitations/accept?token=second',
		]);
	});

	it('throws when the home page URL is missing', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({}));

		const invitations = await loadInvitations();

		await expect(invitations.getAccept('token')).rejects.toThrow(
			'Unable to resolve the invitation service'
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('throws with the status when the accept response is not ok', async () => {
		fetchMock
			.mockResolvedValueOnce(
				jsonResponse({homePageURL: 'https://spring.example.com'})
			)
			.mockResolvedValueOnce(jsonResponse({}, 410));

		const invitations = await loadInvitations();

		await expect(invitations.getAccept('token')).rejects.toThrow(
			'Unable to accept the invitation: 410'
		);
	});
});
