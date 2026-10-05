/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useSelectedProject} from './useSelectedProject';

import type {UserProject} from '~/pages/MyAccount/Projects/types';

const mocks = vi.hoisted(() => ({
	getLastViewedProjectCookie: vi.fn(),
	setLastViewedProjectCookie: vi.fn(),
}));

vi.mock('~/pages/MyAccount/Projects/utils/projectContextUtils', () => ({
	getCurrentUserId: () => '42',
	getSelectedAccountId: () => '10',
}));

vi.mock('~/pages/MyAccount/Projects/utils/projectCookieUtils', () => ({
	getLastViewedProjectCookie: mocks.getLastViewedProjectCookie,
	setLastViewedProjectCookie: mocks.setLastViewedProjectCookie,
}));

function toProjects(...externalReferenceCodes: string[]) {
	return externalReferenceCodes.map((externalReferenceCode) => ({
		externalReferenceCode,
	})) as UserProject[];
}

describe('[HOOK-MYACCOUNT-PROJECTS-USESELECTEDPROJECT] useSelectedProject', () => {
	beforeEach(() => {
		mocks.getLastViewedProjectCookie.mockReset();
		mocks.setLastViewedProjectCookie.mockReset();
	});

	it('resolves the project from the last viewed cookie', () => {
		mocks.getLastViewedProjectCookie.mockReturnValue('PRJCT-2');

		const {result} = renderHook(() =>
			useSelectedProject(false, toProjects('PRJCT-1', 'PRJCT-2'))
		);

		expect(mocks.getLastViewedProjectCookie).toHaveBeenCalledWith(
			'10',
			'42'
		);
		expect(result.current.projectERC).toBe('PRJCT-2');
	});

	it('falls back to the first project when the cookie project is not accessible', () => {
		mocks.getLastViewedProjectCookie.mockReturnValue('PRJCT-9');

		const {result} = renderHook(() =>
			useSelectedProject(false, toProjects('PRJCT-1', 'PRJCT-2'))
		);

		expect(result.current.projectERC).toBe('PRJCT-1');
	});

	it('does nothing while loading and resolves once loading ends', () => {
		mocks.getLastViewedProjectCookie.mockReturnValue('PRJCT-2');

		const projects = toProjects('PRJCT-1', 'PRJCT-2');

		const {rerender, result} = renderHook(
			({loading}) => useSelectedProject(loading, projects),
			{initialProps: {loading: true}}
		);

		expect(result.current.projectERC).toBe('');
		expect(mocks.getLastViewedProjectCookie).not.toHaveBeenCalled();

		rerender({loading: false});

		expect(result.current.projectERC).toBe('PRJCT-2');
	});

	it('stays empty when no project resolves', () => {
		const {result} = renderHook(() => useSelectedProject(false, []));

		expect(result.current.projectERC).toBe('');
	});

	it('sets the project only once', () => {
		mocks.getLastViewedProjectCookie.mockReturnValue('PRJCT-1');

		const {rerender, result} = renderHook(
			({projects}) => useSelectedProject(false, projects),
			{initialProps: {projects: toProjects('PRJCT-1')}}
		);

		mocks.getLastViewedProjectCookie.mockReturnValue('PRJCT-3');

		rerender({projects: toProjects('PRJCT-3')});

		expect(result.current.projectERC).toBe('PRJCT-1');
		expect(mocks.getLastViewedProjectCookie).toHaveBeenCalledTimes(1);
	});

	it('updates the state and writes the cookie when a project is selected', () => {
		const {result} = renderHook(() =>
			useSelectedProject(false, toProjects('PRJCT-1', 'PRJCT-2'))
		);

		act(() => {
			result.current.selectProject('PRJCT-2');
		});

		expect(result.current.projectERC).toBe('PRJCT-2');
		expect(mocks.setLastViewedProjectCookie).toHaveBeenCalledWith(
			'10',
			'PRJCT-2',
			'42'
		);
	});
});
