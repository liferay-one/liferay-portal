/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import CreateFilters from '~/services/fetcher/CreateFilters';
import {filterSchema} from '~/types/filters';
import {downloadFile} from '~/utils/downloadFileUtils';

import Orders from './Orders';

const {oAuth2Fetch} = vi.hoisted(() => ({oAuth2Fetch: vi.fn()}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication: () => Promise.resolve({fetch: oAuth2Fetch}),
	getUserAgentApplication: vi.fn(),
}));

vi.mock('~/utils/downloadFileUtils', () => ({
	downloadFile: vi.fn(),
}));

describe('[CLIENT-SPRING-BOOT-ORDERS] Orders', () => {
	afterEach(() => {
		oAuth2Fetch.mockReset();
		vi.mocked(downloadFile).mockReset();
		vi.restoreAllMocks();
	});

	it('sends the filter built from the chosen schema and saves the CSV as orders.csv', async () => {
		const response = new Response('id,name', {status: 200});

		oAuth2Fetch.mockResolvedValue(response);

		const createFilter = vi
			.spyOn(CreateFilters, 'createFilter')
			.mockReturnValue("orderStatus eq 'open'");

		const schemaName = Object.keys(
			filterSchema
		)[0] as keyof typeof filterSchema;

		await Orders.downloadOrderReport({orderStatus: 'open'}, schemaName);

		expect(createFilter).toHaveBeenCalledWith({
			appliedFilter: {orderStatus: 'open'},
			filterSchema: filterSchema[schemaName],
		});
		expect(oAuth2Fetch).toHaveBeenCalledWith(
			"/orders/export?filters=orderStatus eq 'open'",
			{earlyReturn: true}
		);
		expect(downloadFile).toHaveBeenCalledWith('orders.csv', response);
	});
});
