/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import fetcher from '~/services/fetcher/fetcher';

import GraphQL from './GraphQL';

vi.mock('~/services/fetcher/fetcher', () => ({
	default: {post: vi.fn()},
}));

const postMock = vi.mocked(fetcher.post);

function getQuery() {
	const [, body] = postMock.mock.calls[0];

	return (body as {query: string}).query.replace(/\s+/g, ' ');
}

describe('[CLIENT-HEADLESS-GRAPHQL] GraphQL', () => {
	afterEach(() => {
		postMock.mockReset();
	});

	it('builds one aliased query per filter with pageSize defaulting to 1 and returns the response as is', async () => {
		const response = {data: {metrics: {open: {totalCount: 3}}}};

		postMock.mockResolvedValue(response);

		await expect(
			GraphQL.metrics(
				{group: 'c', name: 'tickets'},
				{closed: "status eq 'closed'", open: "status eq 'open'"}
			)
		).resolves.toBe(response);
		expect(postMock.mock.calls[0][0]).toBe('/o/graphql');
		expect(getQuery()).toContain('metrics: c {');
		expect(getQuery()).toContain(
			`closed: tickets(filter: "status eq 'closed'", pageSize: 1, sort: "") { totalCount }`
		);
		expect(getQuery()).toContain(
			`open: tickets(filter: "status eq 'open'", pageSize: 1, sort: "") { totalCount }`
		);
	});

	it('returns an empty items and zero totalCount entry for every filter alias on failure', async () => {
		postMock.mockRejectedValue(new Error('Network down'));

		await expect(
			GraphQL.metrics({group: 'c', name: 'tickets'}, {a: 'x', b: 'y'})
		).resolves.toEqual({
			data: {
				metrics: {
					a: {items: [], totalCount: 0},
					b: {items: [], totalCount: 0},
				},
			},
		});
	});

	it('takes the body and pageSize from the alias options before the query options', async () => {
		postMock.mockResolvedValue({});

		await GraphQL.metrics(
			{
				group: 'c',
				name: 'tickets',
				options: {body: 'items {id}', pageSize: '5', sort: 'name:asc'},
			},
			{a: 'x', b: 'y'},
			{a: {body: 'items {name}', pageSize: 10}}
		);

		expect(getQuery()).toContain(
			'a: tickets(filter: "x", pageSize: 10, sort: "name:asc") { totalCount items {name} }'
		);
		expect(getQuery()).toContain(
			'b: tickets(filter: "y", pageSize: 5, sort: "name:asc") { totalCount items {id} }'
		);
	});

	it('takes the sort from the top level options before the query options', async () => {
		postMock.mockResolvedValue({});

		await GraphQL.metrics(
			{group: 'c', name: 'tickets', options: {sort: 'name:asc'}},
			{a: 'x'},
			{sort: 'date:desc'}
		);

		expect(getQuery()).toContain('sort: "date:desc"');
	});
});
