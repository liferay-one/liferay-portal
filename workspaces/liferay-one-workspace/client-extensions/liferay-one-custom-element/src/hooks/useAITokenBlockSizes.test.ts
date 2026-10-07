/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useAITokenBlockSizes} from './useAITokenBlockSizes';

const {useFetchMock} = vi.hoisted(() => ({useFetchMock: vi.fn()}));

vi.mock('~/hooks/useFetch', () => ({useFetch: useFetchMock}));

describe('[HOOK-USEAITOKENBLOCKSIZES] useAITokenBlockSizes', () => {
	beforeEach(() => {
		useFetchMock.mockReset();
	});

	it('requests only the active aiTokenBlock entitlement definitions', () => {
		useFetchMock.mockReturnValue({data: undefined, isLoading: true});

		renderHook(() => useAITokenBlockSizes());

		const [url, {params}] = useFetchMock.mock.calls[0];

		expect(url).toBe('/o/c/entitlementdefinitions');
		expect(params.filter).toBe("name eq 'aiTokenBlock' and active eq true");
	});

	it('maps each SKU to its default quantity and drops a missing or zero quantity', () => {
		useFetchMock.mockReturnValue({
			data: {
				items: [
					{defaultQuantity: 5000, skuExternalReferenceCode: 'SKU-5K'},
					{defaultQuantity: 0, skuExternalReferenceCode: 'SKU-ZERO'},
					{skuExternalReferenceCode: 'SKU-MISSING'},
				],
			},
			isLoading: false,
		});

		const {result} = renderHook(() => useAITokenBlockSizes());

		expect([...result.current.tokenBlockSizes]).toEqual([['SKU-5K', 5000]]);
	});

	it('passes the loading and error states through', () => {
		const error = new Error('Unable to load');

		useFetchMock.mockReturnValue({
			data: undefined,
			error,
			isLoading: false,
		});

		const {result} = renderHook(() => useAITokenBlockSizes());

		expect(result.current.error).toBe(error);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.tokenBlockSizes.size).toBe(0);
	});
});
