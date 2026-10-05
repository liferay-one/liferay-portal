/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useOneContext} from '~/context/OneContextProvider';
import {usePlacedOrders} from '~/hooks/usePlacedOrder';

import {useSSADashboardOutlet} from './useSSADashboardOutlet';
import {useSSATrialsExtend} from './useSSATrialsExtend';

const mocks = vi.hoisted(() => ({
	getAccountByExternalReferenceCode: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: vi.fn(),
}));

vi.mock('~/hooks/usePlacedOrder', () => ({
	usePlacedOrders: vi.fn(),
}));

vi.mock('~/services/headless/HeadlessAdminUser', () => ({
	default: {
		getAccountByExternalReferenceCode:
			mocks.getAccountByExternalReferenceCode,
	},
}));

vi.mock('./useSSATrialsExtend', () => ({
	useSSATrialsExtend: vi.fn(),
}));

const mockedUseOneContext = vi.mocked(useOneContext);
const mockedUsePlacedOrders = vi.mocked(usePlacedOrders);
const mockedUseSSATrialsExtend = vi.mocked(useSSATrialsExtend);

function setUp({
	featureFlags = [] as string[],
	inProgressResponse = undefined as {totalCount: number} | undefined,
	ssaAccount = {id: 7} as {id: number} | null,
}) {
	mockedUseOneContext.mockReturnValue({
		myUserAccount: {id: 42, name: 'Jane Doe'},
		properties: {
			featureFlags,
			ssaAccountExternalReferenceCode: 'SSA-ACCOUNT',
		},
	} as unknown as ReturnType<typeof useOneContext>);

	mocks.useSWR.mockReturnValue({data: ssaAccount ?? undefined});

	mockedUsePlacedOrders.mockReturnValue({
		data: inProgressResponse,
	} as unknown as ReturnType<typeof usePlacedOrders>);

	mockedUseSSATrialsExtend.mockReturnValue({
		data: {items: []},
		mutate: vi.fn(),
	} as unknown as ReturnType<typeof useSSATrialsExtend>);

	return renderHook(() => useSSADashboardOutlet());
}

function getPlacedOrdersOptions() {
	return mockedUsePlacedOrders.mock.calls[0][0] as unknown as {
		accountId: number;
		filter: string;
		shouldFetch: boolean;
	};
}

describe('[HOOK-ADMIN-SSADASHBOARD-USESSADASHBOARDOUTLET] useSSADashboardOutlet', () => {
	beforeEach(() => {
		mocks.getAccountByExternalReferenceCode.mockReset();
		mocks.useSWR.mockReset();
		mockedUseOneContext.mockReset();
		mockedUsePlacedOrders.mockReset();
		mockedUseSSATrialsExtend.mockReset();
	});

	it('loads the SSA account by its external reference code', () => {
		setUp({});

		expect(mocks.useSWR.mock.calls[0][0]).toBe('/ssa-account');

		mocks.useSWR.mock.calls[0][1]();

		expect(mocks.getAccountByExternalReferenceCode).toHaveBeenCalledWith(
			'SSA-ACCOUNT'
		);
	});

	it('filters by the unquoted author ID when LPD-63837 is on', () => {
		setUp({featureFlags: ['LPD-63837']});

		const {filter} = getPlacedOrdersOptions();

		expect(filter).toContain('authorId eq 42');
		expect(filter).not.toContain("'42'");
	});

	it('filters by the quoted author name when LPD-63837 is off', () => {
		setUp({});

		const {filter} = getPlacedOrdersOptions();

		expect(filter).toContain("author eq 'Jane Doe'");
		expect(filter).toContain(
			"orderTypeExternalReferenceCode eq 'SSA_SAAS'"
		);
	});

	it('waits for the SSA account before requesting the in progress count', () => {
		const {result} = setUp({ssaAccount: null});

		expect(getPlacedOrdersOptions().shouldFetch).toBe(false);
		expect(result.current.myTrialsInProgress).toBe(0);
	});

	it('exposes the account, the in progress count, and the trial extensions', () => {
		const {result} = setUp({inProgressResponse: {totalCount: 3}});

		expect(getPlacedOrdersOptions()).toMatchObject({
			accountId: 7,
			shouldFetch: true,
		});
		expect(mockedUseSSATrialsExtend).toHaveBeenCalledWith({id: 7});
		expect(result.current).toMatchObject({
			myTrialsInProgress: 3,
			selectedAccountId: 7,
			ssaAccount: {id: 7},
			ssaTrialExtend: {items: []},
		});
	});
});
