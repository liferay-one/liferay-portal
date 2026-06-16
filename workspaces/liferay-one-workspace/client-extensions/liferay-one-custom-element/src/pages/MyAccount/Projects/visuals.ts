/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

// The product logo color and icon are presentation-only and have no home in the
// commerce data model, so they are derived deterministically from the product.

const LOGO_COLORS = [
	'#00b8a3',
	'#1b95e0',
	'#4b9fff',
	'#7b61ff',
	'#9b59b6',
	'#e9518a',
	'#f5b400',
	'#ff7847',
];

const ICON_BY_CATEGORY: {[key: string]: string} = {
	'Analytics': 'analytics',
	'Artificial Intelligence': 'magic',
	'Commerce': 'shopping-cart',
	'Customer Data': 'users',
	'Platform': 'globe',
};

export function getLogoColor(seed: string): string {
	let hash = 0;

	for (let index = 0; index < seed.length; index++) {
		hash = (hash * 31 + seed.charCodeAt(index)) % 9973;
	}

	return LOGO_COLORS[hash % LOGO_COLORS.length];
}

export function getProductIcon(type: string): string {
	return ICON_BY_CATEGORY[type] ?? 'catalog';
}
