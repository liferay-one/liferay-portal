/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {getSiteName, getSiteURL} from './siteUtils';

const {getLayoutRelativeURL} = vi.hoisted(() => ({
	getLayoutRelativeURL: vi.fn(),
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {ThemeDisplay: {getLayoutRelativeURL}},
}));

describe('[MOD-SITEUTILS] siteUtils', () => {
	beforeEach(() => {
		getLayoutRelativeURL.mockReset();
	});

	it('returns the first two path segments for a /web/ layout URL', () => {
		getLayoutRelativeURL.mockReturnValue('/web/one/my-account/projects');

		expect(getSiteURL()).toBe('/web/one');
		expect(getSiteName()).toBe('one');
	});

	it('returns an empty string otherwise', () => {
		getLayoutRelativeURL.mockReturnValue('/group/one/home');

		expect(getSiteURL()).toBe('');
		expect(getSiteName()).toBe('');

		getLayoutRelativeURL.mockReturnValue('/home');

		expect(getSiteURL()).toBe('');
	});
});
