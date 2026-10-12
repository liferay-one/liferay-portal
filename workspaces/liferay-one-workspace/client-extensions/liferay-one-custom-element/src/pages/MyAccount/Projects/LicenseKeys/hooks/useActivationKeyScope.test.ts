/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useActivationKeyScope} from './useActivationKeyScope';

const {useParamsMock, useProjectMock} = vi.hoisted(() => ({
	useParamsMock: vi.fn(),
	useProjectMock: vi.fn(),
}));

vi.mock('react-router', () => ({useParams: useParamsMock}));

vi.mock('~/context/ProjectContext', () => ({useProject: useProjectMock}));

describe('[HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-USEACTIVATIONKEYSCOPE] useActivationKeyScope', () => {
	beforeEach(() => {
		useParamsMock.mockReturnValue({accountERC: 'ACCNT-1'});
	});

	it('scopes a project by its external reference code', () => {
		useProjectMock.mockReturnValue({projectId: 'PRJCT-1'});

		const {result} = renderHook(() => useActivationKeyScope());

		expect(result.current).toEqual({
			projectExternalReferenceCode: 'PRJCT-1',
		});
	});

	it('scopes the one time purchases by the account in the route', () => {
		useProjectMock.mockReturnValue({projectId: 'one-time-purchases'});

		const {result} = renderHook(() => useActivationKeyScope());

		expect(result.current).toEqual({
			accountExternalReferenceCode: 'ACCNT-1',
		});
	});

	it('keeps the same scope across renders', () => {
		useProjectMock.mockReturnValue({projectId: 'PRJCT-1'});

		const {rerender, result} = renderHook(() => useActivationKeyScope());

		const scope = result.current;

		rerender();

		expect(result.current).toBe(scope);
	});
});
