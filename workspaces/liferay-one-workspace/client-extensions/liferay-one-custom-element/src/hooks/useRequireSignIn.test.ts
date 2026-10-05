/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import useRequireSignIn from './useRequireSignIn';

const {isSignedIn, navigate} = vi.hoisted(() => ({
	isSignedIn: vi.fn(),
	navigate: vi.fn(),
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		ThemeDisplay: {isSignedIn},
		Util: {navigate},
	},
}));

describe('[HOOK-USEREQUIRESIGNIN] useRequireSignIn', () => {
	beforeEach(() => {
		isSignedIn.mockReset();
		navigate.mockReset();

		window.history.pushState(
			{},
			'',
			'/web/one/projects?tab=keys&q=a b#section'
		);
	});

	afterEach(() => {
		window.history.pushState({}, '', '/');
	});

	it('redirects a signed out user to the login URL with the encoded current location', () => {
		isSignedIn.mockReturnValue(false);

		const {result} = renderHook(() => useRequireSignIn());

		expect(result.current).toBe(false);
		expect(navigate).toHaveBeenCalledTimes(1);
		expect(navigate).toHaveBeenCalledWith(
			`/c/portal/login?redirect=${encodeURIComponent(
				'/web/one/projects?tab=keys&q=a%20b#section'
			)}`
		);
	});

	it('returns true without navigating for a signed in user', () => {
		isSignedIn.mockReturnValue(true);

		const {result} = renderHook(() => useRequireSignIn());

		expect(result.current).toBe(true);
		expect(navigate).not.toHaveBeenCalled();
	});
});
