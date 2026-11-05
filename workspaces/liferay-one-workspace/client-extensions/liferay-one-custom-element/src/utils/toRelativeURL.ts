/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

export function toRelativeURL(url?: string) {
	if (!url) {
		return '';
	}

	try {
		const {pathname, search} = new URL(url, window.location.origin);

		return pathname + search;
	}
	catch {
		return url;
	}
}

export default toRelativeURL;
