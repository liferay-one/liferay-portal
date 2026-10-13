/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {cache} from 'swr/_internal';

import type {State} from 'swr/_internal';

const MAX_ENTRY_LENGTH = 65536;

const MAX_STORAGE_LENGTH = 2097152;

const STORAGE_KEY = '@liferay-one/swr';

let persisted = false;

function readCacheEntries(): [string, State][] {
	try {
		return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
	}
	catch (error) {
		return [];
	}
}

function toStorableEntries(): [string, State][] {
	const entries: [string, State][] = [];

	let length = 0;

	for (const key of cache.keys()) {
		const state = cache.get(key);

		if (state?.data === undefined) {
			continue;
		}

		const storableState: State = {...state};

		delete storableState.error;
		delete storableState.isLoading;
		delete storableState.isValidating;

		const entry: [string, State] = [key, storableState];

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

export default function persistSWRCache(): void {
	if (persisted) {
		return;
	}

	persisted = true;

	for (const [key, state] of readCacheEntries()) {
		if (!cache.get(key)) {
			cache.set(key, state);
		}
	}

	window.addEventListener('beforeunload', () => {
		try {
			sessionStorage.setItem(
				STORAGE_KEY,
				JSON.stringify(toStorableEntries())
			);
		}
		catch (error) {
			sessionStorage.removeItem(STORAGE_KEY);
		}
	});
}
