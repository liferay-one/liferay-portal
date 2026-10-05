/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, describe, expect, it, vi} from 'vitest';
import PublisherDetails from '~/services/objects/PublisherDetails';

import usePublisherDetails from './usePublisherDetails';

function mockPublisherDetails(response: unknown) {
	return vi
		.spyOn(PublisherDetails, 'getPublisherDetails')
		.mockResolvedValue(
			response as Awaited<
				ReturnType<typeof PublisherDetails.getPublisherDetails>
			>
		);
}

function wrapper({children}: {children: ReactNode}) {
	return (
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			{children}
		</SWRConfig>
	);
}

describe('[HOOK-USEPUBLISHERDETAILS] usePublisherDetails', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends no request without a catalog ID', () => {
		const getPublisherDetails = mockPublisherDetails({items: []});

		const {result} = renderHook(() => usePublisherDetails(null), {
			wrapper,
		});

		expect(result.current.publisherDetails).toBeUndefined();
		expect(getPublisherDetails).not.toHaveBeenCalled();
	});

	it('exposes the first matching item as publisherDetails', async () => {
		const details = {catalogId: 3, id: 1};

		const getPublisherDetails = mockPublisherDetails({
			items: [details, {catalogId: 3, id: 2}],
		});

		const {result} = renderHook(() => usePublisherDetails(3), {wrapper});

		await waitFor(() =>
			expect(result.current.publisherDetails).toEqual(details)
		);

		const [params] = getPublisherDetails.mock.calls[0];

		expect(params?.get('filter')).toBe('catalogId eq 3');
	});

	it('returns null when no item matches', async () => {
		mockPublisherDetails({});

		const {result} = renderHook(() => usePublisherDetails(3), {wrapper});

		await waitFor(() => expect(result.current.publisherDetails).toBeNull());
	});
});
