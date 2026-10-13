/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {Cache} from 'swr/_internal';

const STORAGE_KEY = '@liferay-one/swr';

async function loadPersistSWRCache(): Promise<{
	cache: Cache;
	persistSWRCache: () => void;
}> {
	vi.resetModules();

	const {cache} = await import('swr/_internal');

	for (const key of Array.from(cache.keys())) {
		cache.delete(key);
	}

	const {default: persistSWRCache} = await import('./persistSWRCache');

	return {cache, persistSWRCache};
}

describe('[CLIENT-FETCHER-PERSISTSWRCACHE] persistSWRCache', () => {
	const listeners: EventListener[] = [];

	beforeEach(() => {
		sessionStorage.clear();

		vi.spyOn(window, 'addEventListener').mockImplementation(
			(type, listener) => {
				if (type === 'beforeunload') {
					listeners.push(listener as EventListener);
				}
			}
		);
	});

	afterEach(() => {
		listeners.length = 0;

		vi.restoreAllMocks();
	});

	it('fills the default SWR cache from sessionStorage once', async () => {
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify([['key', {data: 'value'}]])
		);

		const {cache, persistSWRCache} = await loadPersistSWRCache();

		persistSWRCache();
		persistSWRCache();

		expect(cache.get('key')).toEqual({data: 'value'});
		expect(listeners).toHaveLength(1);
	});

	it('keeps an entry the default SWR cache already holds', async () => {
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify([['key', {data: 'stored'}]])
		);

		const {cache, persistSWRCache} = await loadPersistSWRCache();

		cache.set('key', {data: 'fetched'});

		persistSWRCache();

		expect(cache.get('key')).toEqual({data: 'fetched'});
	});

	it('loads nothing for bad JSON', async () => {
		sessionStorage.setItem(STORAGE_KEY, '{not json');

		const {cache, persistSWRCache} = await loadPersistSWRCache();

		persistSWRCache();

		expect(Array.from(cache.keys())).toHaveLength(0);
	});

	it('removes the key when the storage write fails', async () => {
		const {cache, persistSWRCache} = await loadPersistSWRCache();

		persistSWRCache();

		cache.set('key', {data: 'value'});

		sessionStorage.setItem(STORAGE_KEY, 'stale');

		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});

		listeners[0](new Event('beforeunload'));

		expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('writes only fetched data, never the state of a request in flight', async () => {
		const {cache, persistSWRCache} = await loadPersistSWRCache();

		persistSWRCache();

		cache.set('loaded', {
			data: 'value',
			error: undefined,
			isLoading: false,
			isValidating: true,
		});
		cache.set('loading', {isLoading: true, isValidating: true});

		listeners[0](new Event('beforeunload'));

		expect(
			JSON.parse(sessionStorage.getItem(STORAGE_KEY) as string)
		).toEqual([['loaded', {data: 'value'}]]);
	});

	it('writes entries on beforeunload, skipping entries over 64 KB and past the 2 MB total', async () => {
		const {cache, persistSWRCache} = await loadPersistSWRCache();

		persistSWRCache();

		cache.set('large', {data: 'x'.repeat(65536)});
		cache.set('small', {data: 'value'});

		for (let index = 0; index < 40; index++) {
			cache.set(`chunk${index}`, {data: 'y'.repeat(60000)});
		}

		cache.set('tail', {data: 'z'});

		listeners[0](new Event('beforeunload'));

		const entries: [string, {data: string}][] = JSON.parse(
			sessionStorage.getItem(STORAGE_KEY) as string
		);

		const keys = entries.map(([key]) => key);

		expect(keys).not.toContain('large');
		expect(keys[0]).toBe('small');
		expect(keys).toContain('tail');
		expect(keys.filter((key) => key.startsWith('chunk'))).toHaveLength(34);
		expect(JSON.stringify(entries).length).toBeLessThanOrEqual(2097152);
	});
});
