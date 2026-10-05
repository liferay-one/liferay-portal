/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

import setCurrentAccount from './setCurrentAccount';

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		ThemeDisplay: {getScopeGroupId: () => '20121'},
		authToken: 'TOKEN',
	},
}));

describe('[MOD-SETCURRENTACCOUNT] setCurrentAccount', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('posts the account ID with the group ID, p_auth, and CSRF header', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null));

		vi.stubGlobal('fetch', fetchMock);

		await setCurrentAccount('12345');

		expect(fetchMock).toHaveBeenCalledTimes(1);

		const [url, init] = fetchMock.mock.calls[0];

		expect(url).toBe(
			'/o/commerce-ui/set-current-account?groupId=20121&p_auth=TOKEN'
		);
		expect(init.method).toBe('POST');
		expect(init.headers).toEqual({'x-csrf-token': 'TOKEN'});
		expect(init.body).toBeInstanceOf(FormData);
		expect((init.body as FormData).get('accountId')).toBe('12345');
	});
});
