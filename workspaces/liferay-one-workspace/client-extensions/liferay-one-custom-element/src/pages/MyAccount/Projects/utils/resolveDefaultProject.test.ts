/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it} from 'vitest';

import {LAST_PROJECT_STORAGE_KEY} from './constants';
import resolveDefaultProject from './resolveDefaultProject';

import type {UserProject} from '~/pages/MyAccount/Projects/types';

const projects = [
	{externalReferenceCode: 'PRJCT-1'},
	{externalReferenceCode: 'PRJCT-2'},
] as UserProject[];

describe('[MOD-MYACCOUNT-PROJECTS-RESOLVEDEFAULTPROJECT] resolveDefaultProject', () => {
	afterEach(() => {
		localStorage.clear();
	});

	it('returns the project matching the last project in localStorage', () => {
		localStorage.setItem(LAST_PROJECT_STORAGE_KEY, 'PRJCT-2');

		expect(resolveDefaultProject(projects)).toBe(projects[1]);
	});

	it('returns the first project when the last project is unknown or absent', () => {
		expect(resolveDefaultProject(projects)).toBe(projects[0]);

		localStorage.setItem(LAST_PROJECT_STORAGE_KEY, 'PRJCT-9');

		expect(resolveDefaultProject(projects)).toBe(projects[0]);
	});

	it('returns undefined for an empty list', () => {
		expect(resolveDefaultProject([])).toBeUndefined();
	});
});
