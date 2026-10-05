/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import {
	getLastViewedProjectCookie,
	setLastViewedProjectCookie,
} from './projectCookieUtils';

type CookieUtil = typeof Liferay.Util.Cookie;

function clearCookie(name: string) {
	document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

describe('[MOD-MYACCOUNT-PROJECTS-PROJECTCOOKIEUTILS] projectCookieUtils', () => {
	afterEach(() => {
		clearCookie('LO_LAST_VIEWED_PROJECT_7_42');
		(Liferay.Util as {Cookie?: CookieUtil}).Cookie = undefined;
	});

	it('reads and decodes the cookie named after the user and account IDs', () => {
		document.cookie = `LO_LAST_VIEWED_PROJECT_7_42=${encodeURIComponent('PRJCT 1/2')}`;

		expect(getLastViewedProjectCookie('42', '7')).toBe('PRJCT 1/2');
		expect(getLastViewedProjectCookie('7', '42')).toBeUndefined();
	});

	it('returns undefined when the cookie is missing', () => {
		expect(getLastViewedProjectCookie('42', '7')).toBeUndefined();
	});

	it('preserves equals signs in the value', () => {
		document.cookie = 'LO_LAST_VIEWED_PROJECT_7_42=a=b=c';

		expect(getLastViewedProjectCookie('42', '7')).toBe('a=b=c');
	});

	it('writes the encoded ERC as a functional cookie', () => {
		const set = vi.fn();

		(Liferay.Util as {Cookie?: unknown}).Cookie = {
			TYPES: {FUNCTIONAL: 'functional', NECESSARY: 'necessary'},
			set,
		};

		setLastViewedProjectCookie('42', 'PRJCT 1/2', '7');

		expect(set).toHaveBeenCalledWith(
			'LO_LAST_VIEWED_PROJECT_7_42',
			encodeURIComponent('PRJCT 1/2'),
			'functional',
			expect.objectContaining({expires: expect.any(Date), secure: true})
		);
	});

	it('does nothing when Liferay.Util.Cookie is absent', () => {
		expect(() =>
			setLastViewedProjectCookie('42', 'PRJCT-1', '7')
		).not.toThrow();
		expect(getLastViewedProjectCookie('42', '7')).toBeUndefined();
	});
});
