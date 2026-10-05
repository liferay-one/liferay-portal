/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

export function bar(part: number, whole: number, width = 24): string {
	const filled = whole === 0 ? width : Math.round((part / whole) * width);

	return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}]`;
}

export function pct(part: number, whole: number): string {
	if (whole === 0) {
		return '100.0%';
	}

	return `${((part / whole) * 100).toFixed(1)}%`;
}
