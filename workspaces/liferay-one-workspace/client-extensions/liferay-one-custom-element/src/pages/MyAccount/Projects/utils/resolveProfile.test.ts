/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import resolveProfile from './resolveProfile';

describe('[MOD-MYACCOUNT-PROJECTS-RESOLVEPROFILE] resolveProfile', () => {
	it('returns the value when it is allowed', () => {
		expect(resolveProfile('paas', ['none', 'paas'], 'none')).toBe('paas');
	});

	it('returns the fallback otherwise', () => {
		expect(resolveProfile('unknown', ['none', 'paas'], 'none')).toBe(
			'none'
		);
		expect(resolveProfile('', ['none', 'paas'], 'none')).toBe('none');
	});
});
