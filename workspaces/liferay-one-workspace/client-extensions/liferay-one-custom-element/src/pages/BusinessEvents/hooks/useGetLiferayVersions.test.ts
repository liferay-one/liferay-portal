/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getProductVersions} from '~/services/spring-boot/Jira';

import useGetLiferayVersions from './useGetLiferayVersions';

vi.mock('~/services/spring-boot/Jira', () => ({
	getProductVersions: vi.fn(),
}));

describe('[HOOK-BUSINESSEVENTS-USEGETLIFERAYVERSIONS] useGetLiferayVersions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('maps the versions to label and value pairs sorted newest first', async () => {
		vi.mocked(getProductVersions).mockResolvedValue({
			items: [
				{id: 1, name: '7.4'},
				{id: 2, name: '2025.Q1'},
				{id: 3, name: '7.3'},
			],
		});

		const {result} = renderHook(() => useGetLiferayVersions());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current).toEqual({
			error: false,
			loading: false,
			productVersions: [
				{label: '2025.Q1', value: 2},
				{label: '7.4', value: 1},
				{label: '7.3', value: 3},
			],
		});
	});

	it('sets the error flag and clears loading on failure', async () => {
		vi.mocked(getProductVersions).mockRejectedValue(new Error('failed'));

		const {result} = renderHook(() => useGetLiferayVersions());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current).toEqual({
			error: true,
			loading: false,
			productVersions: [],
		});
	});
});
