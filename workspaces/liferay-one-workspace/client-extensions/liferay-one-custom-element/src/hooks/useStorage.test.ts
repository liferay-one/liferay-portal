/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
	CONSENT_TYPE,
	STORAGE_KEYS,
} from '~/services/liferay/MarketplaceStorage';

import useStorage from './useStorage';

const {getStorage, persisted, temporary} = vi.hoisted(() => {
	const persisted = {getItem: vi.fn(), setItem: vi.fn()};
	const temporary = {getItem: vi.fn(), setItem: vi.fn()};

	return {
		getStorage: vi.fn((type: string) =>
			type === 'persisted' ? persisted : temporary
		),
		persisted,
		temporary,
	};
});

vi.mock('~/services/liferay/MarketplaceStorage', async (importOriginal) => ({
	...(await importOriginal<
		typeof import('~/services/liferay/MarketplaceStorage')
	>()),
	default: {getInstance: () => ({getStorage})},
}));

describe('[HOOK-USESTORAGE] useStorage', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('reads the initial value from persisted storage parsed as JSON', () => {
		persisted.getItem.mockReturnValue('{"columns":["name"]}');

		const {result} = renderHook(() =>
			useStorage(STORAGE_KEYS.LIST_VIEW_COLUMNS)
		);

		expect(result.current[0]).toEqual({columns: ['name']});
		expect(persisted.getItem).toHaveBeenCalledWith(
			STORAGE_KEYS.LIST_VIEW_COLUMNS,
			undefined
		);
	});

	it('falls back to the initial value when storage holds nothing', () => {
		temporary.getItem.mockReturnValue(null);

		const {result} = renderHook(() =>
			useStorage(STORAGE_KEYS.SWR_CACHE, {
				initialValue: 'fallback',
				storageType: 'temporary',
			})
		);

		expect(result.current[0]).toBe('fallback');
		expect(getStorage).toHaveBeenCalledWith('temporary');
	});

	it('falls back to the initial value when reading storage throws', () => {
		persisted.getItem.mockImplementation(() => {
			throw new Error('blocked');
		});

		const {result} = renderHook(() =>
			useStorage(STORAGE_KEYS.SWR_CACHE, {
				initialValue: 'fallback',
				storageType: 'persisted',
			})
		);

		expect(result.current[0]).toBe('fallback');
		expect(console.error).toHaveBeenCalled();
	});

	it('writes JSON with the consent type and updates the state on set', () => {
		persisted.getItem.mockReturnValue(null);

		const {result} = renderHook(() =>
			useStorage<{page: number}>(STORAGE_KEYS.SWR_CACHE, {
				consentType: CONSENT_TYPE.FUNCTIONAL,
				storageType: 'persisted',
			})
		);

		act(() => result.current[1]({page: 2}));

		expect(result.current[0]).toEqual({page: 2});
		expect(persisted.getItem).toHaveBeenCalledWith(
			STORAGE_KEYS.SWR_CACHE,
			CONSENT_TYPE.FUNCTIONAL
		);
		expect(persisted.setItem).toHaveBeenCalledWith(
			STORAGE_KEYS.SWR_CACHE,
			'{"page":2}',
			CONSENT_TYPE.FUNCTIONAL
		);
	});

	it('logs a storage write error without throwing', () => {
		persisted.getItem.mockReturnValue(null);
		persisted.setItem.mockImplementation(() => {
			throw new Error('quota');
		});

		const {result} = renderHook(() =>
			useStorage<string>(STORAGE_KEYS.SWR_CACHE, {
				storageType: 'persisted',
			})
		);

		expect(() => act(() => result.current[1]('value'))).not.toThrow();
		expect(result.current[0]).toBe('value');
		expect(console.error).toHaveBeenCalled();
	});
});
