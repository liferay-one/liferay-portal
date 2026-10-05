/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useFetch} from '~/hooks/useFetch';

import useDXPProductVersions from './useDXPProductVersions';

vi.mock('~/hooks/useFetch', () => ({
	useFetch: vi.fn(),
}));

function mockItems(items?: {productVersion?: string}[]) {
	vi.mocked(useFetch).mockReturnValue({
		data: items ? {items} : undefined,
		isLoading: false,
	} as ReturnType<typeof useFetch>);
}

describe('[HOOK-USEDXPPRODUCTVERSIONS] useDXPProductVersions', () => {
	beforeEach(() => {
		vi.mocked(useFetch).mockReset();
	});

	it('requests the quarterly DXP patch versions', () => {
		mockItems([]);

		renderHook(() => useDXPProductVersions());

		const [url, options] = vi.mocked(useFetch).mock.calls[0];

		expect(url).toBe('/o/c/productversions');
		expect(options?.params?.pageSize).toBe(-1);
		expect(options?.params?.filter).toContain("productGroup eq 'dxp'");
	});

	it('sends no request when disabled', () => {
		mockItems();

		const {result} = renderHook(() => useDXPProductVersions(false));

		expect(vi.mocked(useFetch).mock.calls[0][0]).toBeNull();
		expect(result.current.productVersions).toEqual([]);
	});

	it('drops versions that do not match the quarterly pattern', () => {
		mockItems([
			{productVersion: 'DXP 2024.Q1.3'},
			{productVersion: '7.4 U92'},
			{productVersion: 'DXP 2024.Q5.1'},
			{productVersion: 'Portal 2025.Q1.0'},
			{},
		]);

		const {result} = renderHook(() => useDXPProductVersions());

		expect(result.current.productVersions).toEqual(['DXP 2024.Q1.3']);
	});

	it('sorts newest first by year, quarter, then patch', () => {
		mockItems([
			{productVersion: 'DXP 2024.Q4.2'},
			{productVersion: 'DXP 2025.Q1.0'},
			{productVersion: 'DXP 2024.Q4.10'},
			{productVersion: 'DXP 2025.Q2.1'},
			{productVersion: 'DXP 2024.Q1.9'},
		]);

		const {result} = renderHook(() => useDXPProductVersions());

		expect(result.current.productVersions).toEqual([
			'DXP 2025.Q2.1',
			'DXP 2025.Q1.0',
			'DXP 2024.Q4.10',
			'DXP 2024.Q4.2',
			'DXP 2024.Q1.9',
		]);
	});
});
