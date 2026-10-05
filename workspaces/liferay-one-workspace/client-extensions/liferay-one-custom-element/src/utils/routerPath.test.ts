/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import routerPath from './routerPath';

const {getLayoutRelativeURL} = vi.hoisted(() => ({
	getLayoutRelativeURL: vi.fn(),
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		ThemeDisplay: {
			getLayoutRelativeURL,
			getPortalURL: () => 'https://portal.example.com',
		},
	},
}));

describe('[MOD-ROUTERPATH] routerPath', () => {
	beforeEach(() => {
		getLayoutRelativeURL.mockReset();
	});

	it('derives the site prefix from the layout relative URL', () => {
		getLayoutRelativeURL.mockReturnValue('/web/one/my-account');

		expect(routerPath().project('PRJCT-1')).toBe(
			'https://portal.example.com/web/one/project/#/PRJCT-1'
		);
	});

	it('uses no site prefix when the last slash index is 0 or less', () => {
		getLayoutRelativeURL.mockReturnValue('/home');

		expect(routerPath().project('PRJCT-1')).toBe(
			'https://portal.example.com/project/#/PRJCT-1'
		);

		getLayoutRelativeURL.mockReturnValue('home');

		expect(routerPath().project('PRJCT-2')).toBe(
			'https://portal.example.com/project/#/PRJCT-2'
		);
	});
});
