/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import fetcher from '~/services/fetcher/fetcher';

import {queryGraphQL, toGraphQLString} from './GraphQL';

vi.mock('~/services/fetcher/fetcher', () => ({
	default: {post: vi.fn()},
}));

const postMock = vi.mocked(fetcher.post);

describe('[CLIENT-GRAPHQL-GRAPHQL] GraphQL', () => {
	afterEach(() => {
		postMock.mockReset();
	});

	it('merges queries made in the same tick into one aliased document and resolves each alias', async () => {
		postMock.mockResolvedValue({data: {q0: 'first', q1: 'second'}});

		const results = await Promise.all([
			queryGraphQL('a {id}'),
			queryGraphQL('b {id}'),
		]);

		expect(results).toEqual(['first', 'second']);
		expect(postMock).toHaveBeenCalledTimes(1);
		expect(postMock).toHaveBeenCalledWith('/o/graphql', {
			query: '{q0: a {id} q1: b {id}}',
		});
	});

	it('quotes a value as a GraphQL string', () => {
		expect(toGraphQLString('a "b"')).toBe('"a \\"b\\""');
	});

	it('rejects every query on a network failure', async () => {
		const networkError = new Error('Network down');

		postMock.mockRejectedValue(networkError);

		const results = await Promise.allSettled([
			queryGraphQL('a'),
			queryGraphQL('b'),
		]);

		expect(results).toEqual([
			{reason: networkError, status: 'rejected'},
			{reason: networkError, status: 'rejected'},
		]);
	});

	it('rejects a single failing query with the default message when there are no error messages', async () => {
		postMock.mockResolvedValue({data: null});

		await expect(queryGraphQL('a')).rejects.toThrow(
			'Unable to run the GraphQL query'
		);
	});

	it('retries a batch with errors one query at a time and rejects only the failing query with joined messages', async () => {
		postMock.mockImplementation((_url, body) => {
			const {query} = body as {query: string};

			if (query.includes('bad')) {
				return Promise.resolve(
					query.includes('good')
						? {data: null, errors: [{message: 'Batch failed'}]}
						: {
								data: null,
								errors: [
									{message: 'First.'},
									{message: 'Second.'},
								],
							}
				);
			}

			return Promise.resolve({data: {q0: 'fine'}});
		});

		const results = await Promise.allSettled([
			queryGraphQL('good'),
			queryGraphQL('bad'),
		]);

		expect(postMock).toHaveBeenCalledTimes(3);
		expect(postMock.mock.calls.slice(1).map(([, body]) => body)).toEqual([
			{query: '{q0: good}'},
			{query: '{q1: bad}'},
		]);
		expect(results[0]).toEqual({status: 'fulfilled', value: 'fine'});
		expect((results[1] as PromiseRejectedResult).reason.message).toBe(
			'First. Second.'
		);
	});
});
