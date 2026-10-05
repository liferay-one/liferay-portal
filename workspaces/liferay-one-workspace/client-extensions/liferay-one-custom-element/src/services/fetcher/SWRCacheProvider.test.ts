/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const STORAGE_KEY = '@liferay-one/swr';

async function loadProvider() {
	vi.resetModules();

	const {default: SWRCacheProvider} = await import('./SWRCacheProvider');

	return SWRCacheProvider;
}

describe('[CLIENT-FETCHER-SWRCACHEPROVIDER] SWRCacheProvider', () => {
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

	it('loads entries from sessionStorage and reuses the shared map', async () => {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify([['key', 'value']]));

		const SWRCacheProvider = await loadProvider();

		const cacheMap = SWRCacheProvider();

		expect(cacheMap.get('key')).toBe('value');
		expect(SWRCacheProvider()).toBe(cacheMap);
		expect(listeners).toHaveLength(1);
	});

	it('yields an empty map for bad JSON', async () => {
		sessionStorage.setItem(STORAGE_KEY, '{not json');

		const SWRCacheProvider = await loadProvider();

		expect(SWRCacheProvider().size).toBe(0);
	});

	it('removes the key when the storage write fails', async () => {
		const SWRCacheProvider = await loadProvider();

		SWRCacheProvider().set('key', 'value');

		sessionStorage.setItem(STORAGE_KEY, 'stale');

		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});

		listeners[0](new Event('beforeunload'));

		expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('writes entries on beforeunload, skipping entries over 64 KB and past the 2 MB total', async () => {
		const SWRCacheProvider = await loadProvider();

		const cacheMap = SWRCacheProvider();

		cacheMap.set('large', 'x'.repeat(65536));
		cacheMap.set('small', 'value');

		for (let index = 0; index < 40; index++) {
			cacheMap.set(`chunk${index}`, 'y'.repeat(60000));
		}

		cacheMap.set('tail', 'z');

		listeners[0](new Event('beforeunload'));

		const entries: [string, string][] = JSON.parse(
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
