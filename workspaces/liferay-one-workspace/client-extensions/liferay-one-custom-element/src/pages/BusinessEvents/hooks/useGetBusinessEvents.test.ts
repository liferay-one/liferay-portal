/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getBusinessEvents} from '~/services/spring-boot/Jira';

import useGetBusinessEvents from './useGetBusinessEvents';

vi.mock('~/services/spring-boot/Jira', () => ({
	getBusinessEvents: vi.fn(),
}));

describe('[HOOK-BUSINESSEVENTS-USEGETBUSINESSEVENTS] useGetBusinessEvents', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads the business events for the project', async () => {
		const businessEvents = [{id: 'BE-1'}];

		vi.mocked(getBusinessEvents).mockResolvedValue({items: businessEvents});

		const {result} = renderHook(() => useGetBusinessEvents('PRJCT-1'));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(getBusinessEvents).toHaveBeenCalledWith('PRJCT-1');
		expect(result.current.businessEvents).toEqual(businessEvents);
	});

	it('skips the fetch when the project ERC is empty', async () => {
		const {result} = renderHook(() => useGetBusinessEvents(''));

		await Promise.resolve();

		expect(getBusinessEvents).not.toHaveBeenCalled();
		expect(result.current.businessEvents).toEqual([]);
	});

	it('falls back to an empty list when the items are absent', async () => {
		vi.mocked(getBusinessEvents).mockResolvedValue({});

		const {result} = renderHook(() => useGetBusinessEvents('PRJCT-1'));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.businessEvents).toEqual([]);
	});

	it('falls back to an empty list and clears loading when the request fails', async () => {
		vi.mocked(getBusinessEvents).mockRejectedValue(new Error('failed'));

		const {result} = renderHook(() => useGetBusinessEvents('PRJCT-1'));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.businessEvents).toEqual([]);
	});
});
