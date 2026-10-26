/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {entitlementDefinitionEntitlementsQuery} from './entitlementDefinitionEntitlementsQuery';

const mocks = vi.hoisted(() => ({fetcher: vi.fn()}));

vi.mock('~/services/fetcher/fetcher', () => ({default: mocks.fetcher}));

describe('[CLIENT-QUERIES-ENTITLEMENTDEFINITIONENTITLEMENTSQUERY] entitlementDefinitionEntitlementsQuery', () => {
	beforeEach(() => {
		mocks.fetcher.mockReset();
		mocks.fetcher.mockResolvedValue({items: [], totalCount: 0});
	});

	it('has no key without an entitlement definition ID', () => {
		expect(
			entitlementDefinitionEntitlementsQuery(undefined).key
		).toBeNull();
		expect(entitlementDefinitionEntitlementsQuery(500).key).toBe(
			'/entitlement-definition-entitlements/500'
		);
	});

	it('reads one page of the newest entitlements of the entitlement definition', async () => {
		await entitlementDefinitionEntitlementsQuery(500).fetcher();

		const url = new URL(mocks.fetcher.mock.calls[0][0], 'http://x');

		expect(url.pathname).toBe('/o/c/entitlements');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			filter: "r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId eq '500'",
			page: '1',
			pageSize: '100',
			sort: 'dateCreated:desc',
		});
	});
});
