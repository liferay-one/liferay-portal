/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import fetcher from '~/services/fetcher/fetcher';

type GraphQLResponse = {
	data?: Record<string, unknown> | null;
	errors?: {message: string}[];
};

type PendingQuery = {
	alias: string;
	reject: (error: Error) => void;
	resolve: (data: unknown) => void;
	selection: string;
};

const GRAPHQL_URL = '/o/graphql';

let pendingQueries: PendingQuery[] = [];

function toDocument(queries: PendingQuery[]): string {
	const selections = queries.map(
		(query) => `${query.alias}: ${query.selection}`
	);

	return `{${selections.join(' ')}}`;
}

function toError(response: GraphQLResponse): Error {
	const messages = (response.errors ?? []).map((error) => error.message);

	return new Error(messages.join(' ') || 'Unable to run the GraphQL query');
}

function retrySeparately(queries: PendingQuery[]) {
	queries.forEach((query) => run([query]));
}

function run(queries: PendingQuery[]) {
	fetcher
		.post<GraphQLResponse>(GRAPHQL_URL, {query: toDocument(queries)})
		.then((response) => {
			if (response.errors?.length || !response.data) {
				if (queries.length > 1) {
					retrySeparately(queries);

					return;
				}

				queries[0].reject(toError(response));

				return;
			}

			const data = response.data;

			queries.forEach((query) => query.resolve(data[query.alias]));
		})
		.catch((error) => queries.forEach((query) => query.reject(error)));
}

export function queryGraphQL<Data>(selection: string): Promise<Data> {
	return new Promise<Data>((resolve, reject) => {
		pendingQueries.push({
			alias: `q${pendingQueries.length}`,
			reject,
			resolve: resolve as (data: unknown) => void,
			selection,
		});

		if (pendingQueries.length === 1) {
			queueMicrotask(() => {
				const queries = pendingQueries;

				pendingQueries = [];

				run(queries);
			});
		}
	});
}

export function toGraphQLString(value: string): string {
	return JSON.stringify(value);
}
