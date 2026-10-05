/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

import {
	createBusinessEvent,
	getBusinessEventById,
	getBusinessEventFieldOptions,
	getBusinessEventVersions,
	getBusinessEvents,
	getProductVersions,
	getProjectTickets,
	updateBusinessEvent,
} from './Jira';

const {fromUserAgentApplication, oAuth2Fetch} = vi.hoisted(() => {
	const oAuth2Fetch = vi.fn();

	return {
		fromUserAgentApplication: vi.fn(() =>
			Promise.resolve({fetch: oAuth2Fetch})
		),
		oAuth2Fetch,
	};
});

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication: fromUserAgentApplication,
	getUserAgentApplication: vi.fn(),
}));

function errorResponse() {
	return new Response(null, {status: 500, statusText: 'Server Error'});
}

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), {status: 200});
}

describe('[CLIENT-SPRING-BOOT-JIRA] Jira', () => {
	afterEach(() => {
		fromUserAgentApplication.mockClear();
		oAuth2Fetch.mockReset();
	});

	it('creates a business event with a JSON body', async () => {
		const response = new Response(null, {status: 201});

		oAuth2Fetch.mockResolvedValue(response);

		await expect(
			createBusinessEvent({summary: 'Go live'}, 'PRJCT-1')
		).resolves.toBe(response);
		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/jira/projects/PRJCT-1/business-events',
			{
				body: '{"summary":"Go live"}',
				headers: {'Content-Type': 'application/json'},
				method: 'POST',
			}
		);
	});

	it('gets the user agent OAuth2 client on every call', async () => {
		oAuth2Fetch.mockImplementation(() =>
			Promise.resolve(jsonResponse({items: []}))
		);

		await getBusinessEvents('PRJCT-1');
		await getProductVersions();

		expect(fromUserAgentApplication).toHaveBeenCalledTimes(2);
		expect(fromUserAgentApplication).toHaveBeenCalledWith(
			'liferay-one-etc-spring-boot-oaua'
		);
	});

	it('reads a business event and its versions on fixed paths', async () => {
		oAuth2Fetch.mockImplementation(() =>
			Promise.resolve(jsonResponse({id: 'BE-1'}))
		);

		await expect(getBusinessEventById('BE-1', 'PRJCT-1')).resolves.toEqual({
			id: 'BE-1',
		});
		await getBusinessEventVersions('BE-1', 'PRJCT-1');

		expect(oAuth2Fetch.mock.calls).toEqual([
			['/jira/projects/PRJCT-1/business-events/BE-1', undefined],
			['/jira/projects/PRJCT-1/business-events/BE-1/versions', undefined],
		]);
	});

	it('returns the parsed list for the list getters on an ok response', async () => {
		oAuth2Fetch.mockImplementation(() =>
			Promise.resolve(jsonResponse({items: [{id: 1}]}))
		);

		await expect(getBusinessEventFieldOptions('priority')).resolves.toEqual(
			{items: [{id: 1}]}
		);
		await expect(getBusinessEvents('PRJCT-1')).resolves.toEqual({
			items: [{id: 1}],
		});
		await expect(getProductVersions()).resolves.toEqual({
			items: [{id: 1}],
		});
		expect(oAuth2Fetch.mock.calls).toEqual([
			['/jira/business-events/fields/priority/options', undefined],
			['/jira/projects/PRJCT-1/business-events', undefined],
			['/jira/product-versions', undefined],
		]);
	});

	it('returns empty items for the list getters on a non ok response', async () => {
		oAuth2Fetch.mockImplementation(() => Promise.resolve(errorResponse()));

		await expect(getBusinessEventFieldOptions('priority')).resolves.toEqual(
			{items: []}
		);
		await expect(getBusinessEvents('PRJCT-1')).resolves.toEqual({
			items: [],
		});
		await expect(getProductVersions()).resolves.toEqual({items: []});
	});

	it('sends no query string when there are no ticket IDs', async () => {
		oAuth2Fetch.mockImplementation(() =>
			Promise.resolve(jsonResponse({items: []}))
		);

		await getProjectTickets('PRJCT-1');
		await getProjectTickets('PRJCT-1', []);

		expect(oAuth2Fetch.mock.calls).toEqual([
			['/jira/projects/PRJCT-1/tickets', undefined],
			['/jira/projects/PRJCT-1/tickets', undefined],
		]);
	});

	it('sends ticket IDs as repeated query parameters', async () => {
		oAuth2Fetch.mockResolvedValue(jsonResponse({items: []}));

		await getProjectTickets('PRJCT-1', ['LRSD-1', 'LRSD-2']);

		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/jira/projects/PRJCT-1/tickets?ticketIds=LRSD-1&ticketIds=LRSD-2',
			undefined
		);
	});

	it('throws with the status text when the other calls get a non ok response', async () => {
		oAuth2Fetch.mockImplementation(() => Promise.resolve(errorResponse()));

		await expect(createBusinessEvent({}, 'PRJCT-1')).rejects.toThrow(
			'Failed to create business event: Server Error'
		);
		await expect(getBusinessEventById('BE-1', 'PRJCT-1')).rejects.toThrow(
			'Jira API error: Server Error'
		);
		await expect(
			getBusinessEventVersions('BE-1', 'PRJCT-1')
		).rejects.toThrow('Jira API error: Server Error');
		await expect(getProjectTickets('PRJCT-1')).rejects.toThrow(
			'Jira API error: Server Error'
		);
		await expect(
			updateBusinessEvent({}, 'BE-1', 'PRJCT-1')
		).rejects.toThrow('Jira API error: Server Error');
	});

	it('updates a business event with a JSON body', async () => {
		oAuth2Fetch.mockResolvedValue(jsonResponse({id: 'BE-1'}));

		await expect(
			updateBusinessEvent({summary: 'Moved'}, 'BE-1', 'PRJCT-1')
		).resolves.toEqual({id: 'BE-1'});
		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/jira/projects/PRJCT-1/business-events/BE-1',
			{
				body: '{"summary":"Moved"}',
				headers: {'Content-Type': 'application/json'},
				method: 'PUT',
			}
		);
	});
});
