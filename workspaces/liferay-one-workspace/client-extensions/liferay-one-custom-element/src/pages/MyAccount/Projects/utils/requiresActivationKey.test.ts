/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import requiresActivationKey from './requiresActivationKey';

describe('[MOD-MYACCOUNT-PROJECTS-REQUIRESACTIVATIONKEY] requiresActivationKey', () => {
	it.each([
		['6.2', true],
		['7.0', true],
		['7.1.10', true],
		['DXP 7.2', true],
		['dxp 7.2 SP3', true],
		['7.3', false],
		['7.4.13', false],
		['2025.Q1', false],
		['7.x', false],
		['latest', false],
		['', false],
		[undefined, false],
	])('returns %s -> %s', (version, expected) => {
		expect(requiresActivationKey(version)).toBe(expected);
	});
});
