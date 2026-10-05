/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';

import OAuth2Client, {OneSpringBootOAuth2} from './OAuth2Client';

const {fromUserAgentApplication, getUserAgentApplication} = vi.hoisted(() => ({
	fromUserAgentApplication: vi.fn(),
	getUserAgentApplication: vi.fn(),
}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication: fromUserAgentApplication,
	getUserAgentApplication,
}));

class TestOAuth2Client extends OAuth2Client {
	callDelete(resource: string) {
		return this.delete(resource);
	}

	callGet<T>(resource: string, options?: Parameters<OAuth2Client['get']>[1]) {
		return this.get<T>(resource, options as never);
	}

	callParseError(response: Response | Error) {
		return this.parseError(response);
	}

	callPatch(resource: string, data?: unknown) {
		return this.patch(resource, data);
	}

	callPost(resource: string, data?: unknown) {
		return this.post(resource, data);
	}

	callPut(resource: string, data?: unknown) {
		return this.put(resource, data);
	}
}

class TestOneSpringBootOAuth2 extends OneSpringBootOAuth2 {
	callGet(resource: string) {
		return this.get(resource);
	}
}

const fetchMock = vi.fn();

function jsonResponse(body: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(body), {
		headers: {'Content-Type': 'application/json'},
		status: 200,
		...init,
	});
}

describe('[CLIENT-SPRING-BOOT-OAUTH2CLIENT] OAuth2Client', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', fetchMock);

		fromUserAgentApplication.mockResolvedValue({
			fetch: (resource: string, options?: RequestInit) =>
				fetch(resource, options),
		});
	});

	afterEach(() => {
		fetchMock.mockReset();
		fromUserAgentApplication.mockReset();
		getUserAgentApplication.mockReset();

		vi.unstubAllGlobals();
	});

	it('creates the OAuth2 client once and reuses it across requests', async () => {
		fetchMock.mockImplementation(() =>
			Promise.resolve(jsonResponse({ok: true}))
		);

		const client = new TestOAuth2Client('agent', '/base');

		await client.callGet('/a');
		await client.callGet('/b');

		expect(fromUserAgentApplication).toHaveBeenCalledTimes(1);
		expect(fromUserAgentApplication).toHaveBeenCalledWith('agent');
		expect(fetchMock.mock.calls.map(([resource]) => resource)).toEqual([
			'/base/a',
			'/base/b',
		]);
	});

	it('creates the One Spring Boot client for the etc spring boot user agent', async () => {
		fetchMock.mockResolvedValue(jsonResponse({}));

		await new TestOneSpringBootOAuth2('/trial').callGet('/availability');

		expect(fromUserAgentApplication).toHaveBeenCalledWith(
			'liferay-one-etc-spring-boot-oaua'
		);
		expect(fetchMock).toHaveBeenCalledWith(
			'/trial/availability',
			undefined
		);
	});

	it('honors parseResponse instead of parsing JSON', async () => {
		fetchMock.mockResolvedValue(
			new Response('plain text', {headers: {'Content-Length': '10'}})
		);

		const parseResponse = vi.fn(() => 'parsed');

		await expect(
			new TestOAuth2Client('agent', '/base').callGet('/text', {
				parseResponse,
			})
		).resolves.toBe('parsed');
		expect(parseResponse).toHaveBeenCalledTimes(1);
	});

	it('posts FormData bodies without stringifying them', async () => {
		fetchMock.mockResolvedValue(jsonResponse({id: 1}));

		const formData = new FormData();

		formData.append('key', 'value');

		await new TestOAuth2Client('agent', '/base').callPost(
			'/upload',
			formData
		);

		const [, options] = fetchMock.mock.calls[0];

		expect(options.body).toBe(formData);
		expect(options.method).toBe('POST');
	});

	it('rethrows a rejected fetch', async () => {
		const networkError = new Error('Network down');

		fetchMock.mockRejectedValue(networkError);

		await expect(
			new TestOAuth2Client('agent', '/base').callGet('/a')
		).rejects.toBe(networkError);
	});

	it('resolves the home page URL without the trailing slash', async () => {
		getUserAgentApplication.mockResolvedValue({
			homePageURL: 'https://spring.example.com/',
		});

		await expect(
			new TestOAuth2Client('agent', '/base').getHomePageURL()
		).resolves.toBe('https://spring.example.com');
		expect(getUserAgentApplication).toHaveBeenCalledWith('agent');
	});

	it('returns an empty object for a 204 response', async () => {
		fetchMock.mockResolvedValue(new Response(null, {status: 204}));

		await expect(
			new TestOAuth2Client('agent', '/base').callGet('/a')
		).resolves.toEqual({});
	});

	it('returns an empty object for an empty body', async () => {
		fetchMock.mockResolvedValue(
			new Response('', {headers: {'Content-Length': '0'}, status: 200})
		);

		await expect(
			new TestOAuth2Client('agent', '/base').callGet('/a')
		).resolves.toEqual({});
	});

	it('returns the parsed JSON body', async () => {
		fetchMock.mockResolvedValue(jsonResponse({name: 'value'}));

		await expect(
			new TestOAuth2Client('agent', '/base').callGet('/a')
		).resolves.toEqual({name: 'value'});
	});

	it('returns the raw response with earlyReturn', async () => {
		const response = new Response('error', {status: 500});

		fetchMock.mockResolvedValue(response);

		await expect(
			new TestOAuth2Client('agent', '/base').callGet('/a', {
				earlyReturn: true,
			})
		).resolves.toBe(response);
	});

	it('sends DELETE and ignores the response body', async () => {
		const json = vi.fn();

		fetchMock.mockResolvedValue({
			headers: new Headers(),
			json,
			ok: true,
			status: 200,
		});

		await new TestOAuth2Client('agent', '/base').callDelete('/a');

		expect(fetchMock).toHaveBeenCalledWith('/base/a', {method: 'DELETE'});
		expect(json).not.toHaveBeenCalled();
	});

	it('stringifies PATCH, POST, and PUT bodies', async () => {
		fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})));

		const client = new TestOAuth2Client('agent', '/base');

		await client.callPatch('/patch', {active: true});
		await client.callPost('/post', {name: 'post'});
		await client.callPut('/put', {name: 'put'});

		expect(fetchMock.mock.calls).toEqual([
			['/base/patch', {body: '{"active":true}', method: 'PATCH'}],
			['/base/post', {body: '{"name":"post"}', method: 'POST'}],
			['/base/put', {body: '{"name":"put"}', method: 'PUT'}],
		]);
	});

	it('throws a FetcherError with the parsed info for a non ok response', async () => {
		const error = await new TestOAuth2Client('agent', '/base')
			.callParseError(jsonResponse({title: 'Bad request'}, {status: 400}))
			.catch((caughtError) => caughtError);

		expect(error).toBeInstanceOf(FetcherError);
		expect(error.info).toEqual({title: 'Bad request'});
		expect(error.status).toBe(400);
	});

	it('throws a FetcherError without info when the content length is zero', async () => {
		const error = await new TestOAuth2Client('agent', '/base')
			.callParseError(
				new Response('', {
					headers: {'Content-Length': '0'},
					status: 404,
				})
			)
			.catch((caughtError) => caughtError);

		expect(error).toBeInstanceOf(FetcherError);
		expect(error.info).toBeUndefined();
		expect(error.status).toBe(404);
	});

	it('throws when the home page URL is missing', async () => {
		getUserAgentApplication.mockResolvedValue({homePageURL: ''});

		await expect(
			new TestOAuth2Client('agent', '/base').getHomePageURL()
		).rejects.toThrow('Unable to resolve the home page URL of agent');
	});
});
