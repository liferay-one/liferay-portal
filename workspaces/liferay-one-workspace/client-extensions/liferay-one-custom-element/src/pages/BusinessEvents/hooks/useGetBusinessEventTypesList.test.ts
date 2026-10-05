/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getBusinessEventFieldOptions} from '~/services/spring-boot/Jira';

import useGetBusinessEventTypesList from './useGetBusinessEventTypesList';

vi.mock('~/services/spring-boot/Jira', () => ({
	getBusinessEventFieldOptions: vi.fn(),
}));

describe('[HOOK-BUSINESSEVENTS-USEGETBUSINESSEVENTTYPESLIST] useGetBusinessEventTypesList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('maps the event types to label and value pairs sorted by label', async () => {
		vi.mocked(getBusinessEventFieldOptions).mockResolvedValue({
			items: [
				{extra: 'x', label: 'Upgrade', value: 'upgrade'},
				{label: 'Go Live', value: 'go-live'},
			],
		});

		const {result} = renderHook(() => useGetBusinessEventTypesList());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(getBusinessEventFieldOptions).toHaveBeenCalledWith('Event Type');
		expect(result.current).toEqual({
			businessEventTypesList: [
				{label: 'Go Live', value: 'go-live'},
				{label: 'Upgrade', value: 'upgrade'},
			],
			error: false,
			loading: false,
		});
	});

	it('sets the error flag and clears loading on failure', async () => {
		vi.mocked(getBusinessEventFieldOptions).mockRejectedValue(
			new Error('failed')
		);

		const {result} = renderHook(() => useGetBusinessEventTypesList());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current).toEqual({
			businessEventTypesList: [],
			error: true,
			loading: false,
		});
	});
});
