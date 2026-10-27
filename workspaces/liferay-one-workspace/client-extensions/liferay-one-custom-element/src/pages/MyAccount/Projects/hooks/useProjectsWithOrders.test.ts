/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProjectOrders} from '~/hooks/useProjectOrders';

import {useProjectsWithOrders} from './useProjectsWithOrders';
import {useUserProjects} from './useUserProjects';

vi.mock('~/hooks/useProjectOrders', async (importOriginal) => ({
	...(await importOriginal<typeof import('~/hooks/useProjectOrders')>()),
	useProjectOrders: vi.fn(),
}));

vi.mock('./useUserProjects', () => ({
	useUserProjects: vi.fn(),
}));

const alpha = {externalReferenceCode: 'PRJCT-ALPHA', id: 1, name: 'Alpha'};
const beta = {externalReferenceCode: 'PRJCT-BETA', id: 2, name: 'Beta'};

function mockState({
	accountProjects = [alpha, beta] as unknown[],
	hasAccountProjects = true,
	ordersError = undefined as unknown,
	ordersLoading = false,
	placedOrders = [] as unknown[],
	projects = [alpha, beta] as unknown[],
	projectsLoading = false,
} = {}) {
	vi.mocked(useProjectOrders).mockReturnValue({
		error: ordersError,
		loading: ordersLoading,
		placedOrders,
	} as unknown as ReturnType<typeof useProjectOrders>);
	vi.mocked(useUserProjects).mockReturnValue({
		accountProjects,
		hasAccountProjects,
		loading: projectsLoading,
		projects,
	} as unknown as ReturnType<typeof useUserProjects>);
}

describe('[HOOK-MYACCOUNT-PROJECTS-USEPROJECTSWITHORDERS] useProjectsWithOrders', () => {
	beforeEach(() => {
		mockState();
	});

	it('keeps only the projects that have a placed order', () => {
		mockState({placedOrders: [{customFields: {projectName: 'Alpha'}}]});

		const {result} = renderHook(() => useProjectsWithOrders());

		expect(result.current.projects).toEqual([alpha]);
	});

	it('matches an order by its Salesforce project ID before its name', () => {
		mockState({
			placedOrders: [
				{
					customFields: {
						projectName: 'Alpha',
						salesforceProjectId: 'PRJCT-BETA',
					},
				},
			],
		});

		const {result} = renderHook(() => useProjectsWithOrders());

		expect(result.current.projects).toEqual([beta]);
	});

	it('keeps every project when the orders cannot be read', () => {
		mockState({ordersError: new Error('Unable to read orders')});

		const {result} = renderHook(() => useProjectsWithOrders());

		expect(result.current.projects).toEqual([alpha, beta]);
	});

	it('reports no account projects when no project of the account has a placed order', () => {
		mockState({placedOrders: [{customFields: {projectName: 'Gamma'}}]});

		const {result} = renderHook(() => useProjectsWithOrders());

		expect(result.current.hasAccountProjects).toBe(false);
	});

	it('reports account projects when a project the user is not a member of has a placed order', () => {
		mockState({
			placedOrders: [{customFields: {projectName: 'Beta'}}],
			projects: [alpha],
		});

		const {result} = renderHook(() => useProjectsWithOrders());

		expect(result.current.hasAccountProjects).toBe(true);
		expect(result.current.projects).toEqual([]);
	});

	it('reports the account projects as read when the orders cannot be read', () => {
		mockState({
			hasAccountProjects: true,
			ordersError: new Error('Unable to read orders'),
		});

		const {result} = renderHook(() => useProjectsWithOrders());

		expect(result.current.hasAccountProjects).toBe(true);
	});

	it.each([
		['orders', {ordersLoading: true}],
		['projects', {projectsLoading: true}],
	])('is loading while the %s load', (_label, state) => {
		mockState(state);

		const {result} = renderHook(() => useProjectsWithOrders());

		expect(result.current.loading).toBe(true);
	});
});
