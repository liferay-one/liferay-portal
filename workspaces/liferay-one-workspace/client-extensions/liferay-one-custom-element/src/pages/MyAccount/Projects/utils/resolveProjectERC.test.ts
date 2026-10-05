/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import resolveProjectERC from './resolveProjectERC';

import type {UserProject} from '~/pages/MyAccount/Projects/types';

const projects = [
	{externalReferenceCode: 'PRJCT-1'},
	{externalReferenceCode: 'PRJCT-2'},
] as UserProject[];

describe('[MOD-MYACCOUNT-PROJECTS-RESOLVEPROJECTERC] resolveProjectERC', () => {
	it('returns the cookie project when it is accessible', () => {
		expect(resolveProjectERC(projects, 'PRJCT-2')).toBe('PRJCT-2');
	});

	it('returns the first project when the cookie project is inaccessible or absent', () => {
		expect(resolveProjectERC(projects, 'PRJCT-9')).toBe('PRJCT-1');
		expect(resolveProjectERC(projects, '')).toBe('PRJCT-1');
		expect(resolveProjectERC(projects)).toBe('PRJCT-1');
	});

	it('returns undefined without projects', () => {
		expect(resolveProjectERC([], 'PRJCT-1')).toBeUndefined();
	});
});
