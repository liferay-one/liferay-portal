/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
	ProjectEnvironment,
	useProjectEnvironments,
} from '~/hooks/useProjectEnvironments';

import {useHasWorkspace} from './useHasWorkspace';

vi.mock('~/hooks/useProjectEnvironments', () => ({
	useProjectEnvironments: vi.fn(),
}));

const mockedUseProjectEnvironments = vi.mocked(useProjectEnvironments);

function mockEnvironments(
	environments: Partial<ProjectEnvironment>[],
	loading = false
) {
	mockedUseProjectEnvironments.mockReturnValue({
		environments,
		loading,
	} as unknown as ReturnType<typeof useProjectEnvironments>);
}

function toEnvironment(
	offering: string,
	workspaceName: string,
	projectExternalReferenceCode = 'PRJCT-1'
) {
	return {offering, projectExternalReferenceCode, workspaceName};
}

describe('[HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY-USEHASWORKSPACE] useHasWorkspace', () => {
	beforeEach(() => {
		mockedUseProjectEnvironments.mockReset();
	});

	it.each(['AI Hub', 'Analytics Cloud'])(
		'is true for a %s environment with a workspace name',
		(offering) => {
			mockEnvironments([toEnvironment(offering, 'workspace')]);

			const {result} = renderHook(() => useHasWorkspace('PRJCT-1'));

			expect(result.current).toEqual({
				hasWorkspace: true,
				loading: false,
			});
		}
	);

	it('is false for a workspace offering without a workspace name', () => {
		mockEnvironments([toEnvironment('AI Hub', '')]);

		const {result} = renderHook(() => useHasWorkspace('PRJCT-1'));

		expect(result.current.hasWorkspace).toBe(false);
	});

	it('is false for another offering with a workspace name', () => {
		mockEnvironments([toEnvironment('DXP Cloud', 'workspace')]);

		const {result} = renderHook(() => useHasWorkspace('PRJCT-1'));

		expect(result.current.hasWorkspace).toBe(false);
	});

	it('ignores environments of another project', () => {
		mockEnvironments([toEnvironment('AI Hub', 'workspace', 'PRJCT-2')]);

		const {result} = renderHook(() => useHasWorkspace('PRJCT-1'));

		expect(result.current.hasWorkspace).toBe(false);
	});

	it('passes the loading state through', () => {
		mockEnvironments([], true);

		const {result} = renderHook(() => useHasWorkspace('PRJCT-1'));

		expect(result.current).toEqual({hasWorkspace: false, loading: true});
	});
});
