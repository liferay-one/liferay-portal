/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getBusinessEventFieldOptions} from '~/services/spring-boot/Jira';

import useGetUTCTimeZonesList from './useGetUTCTimeZonesList';

vi.mock('~/services/spring-boot/Jira', () => ({
	getBusinessEventFieldOptions: vi.fn(),
}));

describe('[HOOK-BUSINESSEVENTS-USEGETUTCTIMEZONESLIST] useGetUTCTimeZonesList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('maps the time zones to label and value pairs in API order', async () => {
		vi.mocked(getBusinessEventFieldOptions).mockResolvedValue({
			items: [
				{extra: 'x', label: 'UTC+09:00', value: 'tokyo'},
				{label: 'UTC-05:00', value: 'new-york'},
			],
		});

		const {result} = renderHook(() => useGetUTCTimeZonesList());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(getBusinessEventFieldOptions).toHaveBeenCalledWith('Time Zone');
		expect(result.current).toEqual({
			error: false,
			loading: false,
			utcTimeZonesList: [
				{label: 'UTC+09:00', value: 'tokyo'},
				{label: 'UTC-05:00', value: 'new-york'},
			],
		});
	});

	it('sets the error flag and clears loading on failure', async () => {
		vi.mocked(getBusinessEventFieldOptions).mockRejectedValue(
			new Error('failed')
		);

		const {result} = renderHook(() => useGetUTCTimeZonesList());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current).toEqual({
			error: true,
			loading: false,
			utcTimeZonesList: [],
		});
	});
});
