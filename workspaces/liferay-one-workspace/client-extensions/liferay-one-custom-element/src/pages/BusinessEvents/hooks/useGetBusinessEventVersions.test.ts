/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getBusinessEventVersions} from '~/services/spring-boot/Jira';

import useGetBusinessEventVersions from './useGetBusinessEventVersions';

vi.mock('~/services/spring-boot/Jira', () => ({
	getBusinessEventVersions: vi.fn(),
}));

describe('[HOOK-BUSINESSEVENTS-USEGETBUSINESSEVENTVERSIONS] useGetBusinessEventVersions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads the version history for the business event', async () => {
		const versions = [{id: 'V-1'}, {id: 'V-2'}];

		vi.mocked(getBusinessEventVersions).mockResolvedValue({
			items: versions,
		});

		const {result} = renderHook(() =>
			useGetBusinessEventVersions('BE-1', 'PRJCT-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(getBusinessEventVersions).toHaveBeenCalledWith(
			'BE-1',
			'PRJCT-1'
		);
		expect(result.current.businessEventVersions).toEqual(versions);
	});

	it('skips the fetch when the ID is missing', async () => {
		const {result} = renderHook(() =>
			useGetBusinessEventVersions('', 'PRJCT-1')
		);

		await Promise.resolve();

		expect(getBusinessEventVersions).not.toHaveBeenCalled();
		expect(result.current.businessEventVersions).toEqual([]);
	});

	it('skips the fetch when the project ERC is missing', async () => {
		renderHook(() => useGetBusinessEventVersions('BE-1', ''));

		await Promise.resolve();

		expect(getBusinessEventVersions).not.toHaveBeenCalled();
	});

	it('falls back to an empty list when the items are absent', async () => {
		vi.mocked(getBusinessEventVersions).mockResolvedValue({});

		const {result} = renderHook(() =>
			useGetBusinessEventVersions('BE-1', 'PRJCT-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.businessEventVersions).toEqual([]);
	});

	it('falls back to an empty list and clears loading when the request fails', async () => {
		vi.mocked(getBusinessEventVersions).mockRejectedValue(
			new Error('failed')
		);

		const {result} = renderHook(() =>
			useGetBusinessEventVersions('BE-1', 'PRJCT-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.businessEventVersions).toEqual([]);
	});
});
