/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import accountPlaceholder from '~/assets/images/app_placeholder.png';

import getAccountImage from './getAccountImage';

describe('[MOD-GETACCOUNTIMAGE] getAccountImage', () => {
	it('returns the placeholder for a missing URL', () => {
		expect(getAccountImage()).toBe(accountPlaceholder);
		expect(getAccountImage('')).toBe(accountPlaceholder);
	});

	it('returns the placeholder for a URL containing img_id=0', () => {
		expect(getAccountImage('/image/logo?img_id=0&t=1')).toBe(
			accountPlaceholder
		);
	});

	it('returns the URL otherwise', () => {
		expect(getAccountImage('/image/logo?img_id=123')).toBe(
			'/image/logo?img_id=123'
		);
	});
});
