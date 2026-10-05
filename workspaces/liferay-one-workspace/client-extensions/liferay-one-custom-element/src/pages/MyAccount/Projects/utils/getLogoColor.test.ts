/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {LOGO_COLORS} from './constants';
import getLogoColor from './getLogoColor';

describe('[MOD-MYACCOUNT-PROJECTS-GETLOGOCOLOR] getLogoColor', () => {
	it('returns the same color for the same seed', () => {
		expect(getLogoColor('Acme Project')).toBe(getLogoColor('Acme Project'));
	});

	it('picks the LOGO_COLORS entry at the hash index', () => {
		expect(getLogoColor('')).toBe(LOGO_COLORS[0]);
		expect(getLogoColor('\u0003')).toBe(LOGO_COLORS[3]);
		expect(getLogoColor('\u0009')).toBe(LOGO_COLORS[1]);
	});

	it('always returns a LOGO_COLORS entry', () => {
		for (const seed of ['a', 'Acme', 'PRJCT-001', 'x'.repeat(100)]) {
			expect(LOGO_COLORS).toContain(getLogoColor(seed));
		}
	});
});
