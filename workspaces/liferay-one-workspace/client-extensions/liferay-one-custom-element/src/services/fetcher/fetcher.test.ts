/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import FetcherError from './FetcherError';
import fetcher from './fetcher';

const ORIGIN = window.location.origin;

function jsonResponse(body: unknown, init?: ResponseInit) {
	const response = new Response(JSON.stringify(body), {
		status: 200,
		...init,
	});

	return response;
}

describe('[CLIENT-FETCHER-FETCHER] fetcher', () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		Liferay.authToken = 'csrf-token';

		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		fetchMock.mockReset();

		Liferay.authToken = '';

		vi.unstubAllGlobals();
	});

	it('applies the CSRF header and the JSON content type', async () => {
		fetchMock.mockResolvedValue(jsonResponse({id: 1}));

		await expect(fetcher('o/resource')).resolves.toEqual({id: 1});
		expect(fetchMock).toHaveBeenCalledWith(`${ORIGIN}/o/resource`, {
			headers: {
				'Content-Type': 'application/json',
				'x-csrf-token': 'csrf-token',
			},
		});
	});

	it('keeps a custom content type from a headers object, a Headers instance, or an entry array', async () => {
		fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})));

		await fetcher('/a', {headers: {'content-type': 'text/plain'}});
		await fetcher('/a', {
			headers: new Headers({'Content-Type': 'text/csv'}),
		});
		await fetcher('/a', {headers: [['Content-Type', 'text/xml']]});

		expect(
			fetchMock.mock.calls.map(([, options]) => options.headers)
		).toEqual([
			{'content-type': 'text/plain', 'x-csrf-token': 'csrf-token'},
			{'content-type': 'text/csv', 'x-csrf-token': 'csrf-token'},
			{'Content-Type': 'text/xml', 'x-csrf-token': 'csrf-token'},
		]);
	});

	it('keeps an absolute resource and prefixes the origin on a leading slash', async () => {
		fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})));

		await fetcher('https://example.com/api');
		await fetcher('/o/api');

		expect(fetchMock.mock.calls.map(([resource]) => resource)).toEqual([
			'https://example.com/api',
			`${ORIGIN}/o/api`,
		]);
	});

	it('omits the JSON content type for a FormData body', async () => {
		fetchMock.mockResolvedValue(jsonResponse({}));

		const formData = new FormData();

		await fetcher.post('/upload', formData);

		const [, options] = fetchMock.mock.calls[0];

		expect(options.body).toBe(formData);
		expect(options.headers).toEqual({'x-csrf-token': 'csrf-token'});
		expect(options.method).toBe('POST');
	});

	it('passes the body through when shouldStringify is false and sends null for a null body', async () => {
		fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})));

		await fetcher.post('/raw', 'raw-body', {shouldStringify: false});
		await fetcher.post('/empty', null);

		expect(fetchMock.mock.calls.map(([, options]) => options.body)).toEqual(
			['raw-body', null]
		);
	});

	it('returns an empty object for DELETE, 204, and zero content length', async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ignored: true}))
			.mockResolvedValueOnce(new Response(null, {status: 204}))
			.mockResolvedValueOnce(
				jsonResponse(
					{ignored: true},
					{headers: {'Content-Length': '0'}}
				)
			);

		await expect(fetcher.delete('/a')).resolves.toEqual({});
		await expect(fetcher('/b')).resolves.toEqual({});
		await expect(fetcher('/c')).resolves.toEqual({});
		expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
	});

	it('stringifies the body for post, patch, and put', async () => {
		fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})));

		await fetcher.patch('/a', {b: 1});
		await fetcher.post('/a', {c: 2});
		await fetcher.put('/a', {d: 3});

		expect(
			fetchMock.mock.calls.map(([, {body, method}]) => [method, body])
		).toEqual([
			['PATCH', '{"b":1}'],
			['POST', '{"c":2}'],
			['PUT', '{"d":3}'],
		]);
	});

	it('throws a FetcherError with the parsed info and status on a non ok response', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({title: 'Bad request'}, {status: 400})
		);

		const error = await fetcher<FetcherError>('/a').catch(
			(caughtError: FetcherError) => caughtError
		);

		expect(error).toBeInstanceOf(FetcherError);
		expect(error.info).toEqual({title: 'Bad request'});
		expect(error.message).toBe(
			'An error occurred while fetching the data.'
		);
		expect(error.status).toBe(400);
	});

	it('throws a FetcherError instead of a parse error when a 200 body ends partway', async () => {
		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});

		fetchMock.mockResolvedValue(
			new Response('{"items": [{"id": 1, "price": ', {status: 200})
		);

		const error = await fetcher('/a').catch(
			(caughtError: FetcherError) => caughtError
		);

		expect(error).toBeInstanceOf(FetcherError);
		expect((error as FetcherError).message).toBe(
			'An error occurred while fetching the data.'
		);
		expect((error as FetcherError).status).toBe(200);
		expect(consoleErrorSpy).toHaveBeenCalledOnce();

		consoleErrorSpy.mockRestore();
	});

	it('keeps the status when a non ok response body is not JSON', async () => {
		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});

		fetchMock.mockResolvedValue(
			new Response('<html>Bad Gateway</html>', {status: 502})
		);

		const error = await fetcher<FetcherError>('/a').catch(
			(caughtError: FetcherError) => caughtError
		);

		expect(error).toBeInstanceOf(FetcherError);
		expect(error.info).toBeUndefined();
		expect(error.status).toBe(502);

		consoleErrorSpy.mockRestore();
	});
});
