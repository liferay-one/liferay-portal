/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const STORAGE_KEY = '@liferay-one/swr';

let sharedCacheMap: Map<string, unknown> | undefined;

const SWRCacheProvider = (): Map<string, unknown> => {
	if (sharedCacheMap) {
		return sharedCacheMap;
	}

	const cacheMap = new Map<string, unknown>(
		JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
	);

	window.addEventListener('beforeunload', () => {
		const appCache = JSON.stringify(Array.from(cacheMap.entries()));

		sessionStorage.setItem(STORAGE_KEY, appCache);
	});

	sharedCacheMap = cacheMap;

	return cacheMap;
};

export default SWRCacheProvider;
