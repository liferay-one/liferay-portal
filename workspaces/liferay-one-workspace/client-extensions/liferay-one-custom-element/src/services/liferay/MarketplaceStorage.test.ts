/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it, vi} from 'vitest';

import MarketplaceStorage, {
	CONSENT_TYPE,
	STORAGE_KEYS,
} from './MarketplaceStorage';

const {localStorage, sessionStorage} = vi.hoisted(() => {
	const createStorage = () => ({
		getItem: vi.fn(() => 'stored'),
		removeItem: vi.fn(),
		setItem: vi.fn(),
	});

	const storages = {
		localStorage: createStorage(),
		sessionStorage: createStorage(),
	};

	const liferay = (window as unknown as {Liferay: {Util: object}}).Liferay;

	Object.assign(liferay.Util, {
		LocalStorage: storages.localStorage,
		SessionStorage: storages.sessionStorage,
	});

	return storages;
});

describe('[CLIENT-LIFERAY-MARKETPLACESTORAGE] MarketplaceStorage', () => {
	it('maps persisted to local storage and any other value to session storage', () => {
		const marketplaceStorage = MarketplaceStorage.getInstance();

		marketplaceStorage
			.getStorage('persisted')
			.setItem('persisted-key', 'a');
		marketplaceStorage
			.getStorage('temporary')
			.setItem('temporary-key', 'b');

		expect(localStorage.setItem).toHaveBeenCalledWith(
			'persisted-key',
			'a',
			CONSENT_TYPE.NECESSARY
		);
		expect(sessionStorage.setItem).toHaveBeenCalledWith(
			'temporary-key',
			'b',
			CONSENT_TYPE.NECESSARY
		);
	});

	it('passes the default NECESSARY consent type to get and set and forwards removeItem', () => {
		const storage =
			MarketplaceStorage.getInstance().getStorage('persisted');

		expect(storage.getItem(STORAGE_KEYS.SWR_CACHE)).toBe('stored');
		expect(localStorage.getItem).toHaveBeenCalledWith(
			STORAGE_KEYS.SWR_CACHE,
			CONSENT_TYPE.NECESSARY
		);

		storage.getItem(STORAGE_KEYS.SWR_CACHE, CONSENT_TYPE.FUNCTIONAL);
		storage.setItem('key', 'value', CONSENT_TYPE.PERFORMANCE);
		storage.removeItem('key');

		expect(localStorage.getItem).toHaveBeenLastCalledWith(
			STORAGE_KEYS.SWR_CACHE,
			CONSENT_TYPE.FUNCTIONAL
		);
		expect(localStorage.setItem).toHaveBeenLastCalledWith(
			'key',
			'value',
			CONSENT_TYPE.PERFORMANCE
		);
		expect(localStorage.removeItem).toHaveBeenCalledWith('key');
	});

	it('returns one singleton from getInstance', () => {
		expect(MarketplaceStorage.getInstance()).toBe(
			MarketplaceStorage.getInstance()
		);
		expect(MarketplaceStorage.KEYS).toBe(STORAGE_KEYS);
	});
});
