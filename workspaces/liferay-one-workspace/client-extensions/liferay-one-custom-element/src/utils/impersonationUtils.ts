/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Liferay} from '~/services/liferay/liferay';

function setParameter(url: string, name: string, value: string) {
	const isAbsolute = /^([a-z][a-z\d+.-]*:)?\/\//i.test(url);

	const urlObject = new URL(url, window.location.origin);

	if (urlObject.searchParams.has(name)) {
		return url;
	}

	urlObject.searchParams.set(name, value);

	if (isAbsolute) {
		return urlObject.toString();
	}

	return `${urlObject.pathname}${urlObject.search}${urlObject.hash}`;
}

export function isImpersonating() {
	const {getRealUserId, getUserId} = Liferay.ThemeDisplay;

	if (!getRealUserId) {
		return false;
	}

	return String(getRealUserId()) !== String(getUserId());
}

export function appendDoAsUserId(url: string) {
	if (!isImpersonating()) {
		return url;
	}

	return setParameter(
		url,
		'doAsUserId',
		String(Liferay.ThemeDisplay.getUserId())
	);
}

export function appendDoAsUserIdEncoded(url: string) {
	const doAsUserIdEncoded = Liferay.ThemeDisplay.getDoAsUserIdEncoded?.();

	if (!doAsUserIdEncoded) {
		return url;
	}

	const {origin} = new URL(url, window.location.origin);

	if (origin !== window.location.origin) {
		return url;
	}

	return setParameter(url, 'doAsUserId', doAsUserIdEncoded);
}

export function fetchLiferay(url: string, init?: RequestInit) {
	return fetch(appendDoAsUserIdEncoded(url), init);
}
