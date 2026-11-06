/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useMarketplaceContext} from '~/context/MarketplaceContextProvider';

import usePublisherPermissions from './usePublisherPermissions';

vi.mock('~/context/MarketplaceContextProvider', () => ({
	useMarketplaceContext: vi.fn(),
}));

function mockUserAccount(marketplaceUserAccount: Record<string, boolean>) {
	vi.mocked(useMarketplaceContext).mockReturnValue({
		marketplaceUserAccount,
	} as never);
}

describe('[HOOK-PUBLISHERDASHBOARD-USEPUBLISHERPERMISSIONS] usePublisherPermissions', () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it('lets an app publisher publish apps only', () => {
		mockUserAccount({isAppPublisher: true});

		expect(
			renderHook(() => usePublisherPermissions()).result.current
		).toEqual({canPublishApps: true, canPublishSolutions: false});
	});

	it('lets a solution publisher publish solutions only', () => {
		mockUserAccount({isSolutionPublisher: true});

		expect(
			renderHook(() => usePublisherPermissions()).result.current
		).toEqual({canPublishApps: false, canPublishSolutions: true});
	});

	it('lets a user with both roles or an administrator publish both', () => {
		mockUserAccount({isAppPublisher: true, isSolutionPublisher: true});

		expect(
			renderHook(() => usePublisherPermissions()).result.current
		).toEqual({canPublishApps: true, canPublishSolutions: true});

		mockUserAccount({isAdmin: true});

		expect(
			renderHook(() => usePublisherPermissions()).result.current
		).toEqual({canPublishApps: true, canPublishSolutions: true});
	});

	it('lets a supplier without a publisher role publish nothing', () => {
		mockUserAccount({});

		expect(
			renderHook(() => usePublisherPermissions()).result.current
		).toEqual({canPublishApps: false, canPublishSolutions: false});
	});
});
