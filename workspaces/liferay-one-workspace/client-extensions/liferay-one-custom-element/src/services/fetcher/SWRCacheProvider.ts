/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const MAX_ENTRY_LENGTH = 65536;

const MAX_STORAGE_LENGTH = 2097152;

const STORAGE_KEY = '@liferay-one/swr';

let sharedCacheMap: Map<string, unknown> | undefined;

function readCacheEntries(): [string, unknown][] {
	try {
		return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
	}
	catch (error) {
		return [];
	}
}

function toStorableEntries(
	cacheMap: Map<string, unknown>
): [string, unknown][] {
	const entries: [string, unknown][] = [];

	let length = 0;

	for (const entry of cacheMap.entries()) {
		const entryLength = JSON.stringify(entry).length;

		if (
			entryLength > MAX_ENTRY_LENGTH ||
			length + entryLength > MAX_STORAGE_LENGTH
		) {
			continue;
		}

		entries.push(entry);

		length += entryLength;
	}

	return entries;
}

const SWRCacheProvider = (): Map<string, unknown> => {
	if (sharedCacheMap) {
		return sharedCacheMap;
	}

	const cacheMap = new Map<string, unknown>(readCacheEntries());

	window.addEventListener('beforeunload', () => {
		try {
			sessionStorage.setItem(
				STORAGE_KEY,
				JSON.stringify(toStorableEntries(cacheMap))
			);
		}
		catch (error) {
			sessionStorage.removeItem(STORAGE_KEY);
		}
	});

	sharedCacheMap = cacheMap;

	return cacheMap;
};

export default SWRCacheProvider;
