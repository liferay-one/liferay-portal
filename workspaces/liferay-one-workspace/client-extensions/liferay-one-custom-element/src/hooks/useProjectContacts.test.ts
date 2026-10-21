/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import {useProjectContacts} from './useProjectContacts';

const {useFetchMock} = vi.hoisted(() => ({useFetchMock: vi.fn()}));

vi.mock('~/hooks/useFetch', () => ({useFetch: useFetchMock}));

describe('[HOOK-USEPROJECTCONTACTS] useProjectContacts', () => {
	beforeEach(() => {
		useFetchMock.mockReset();

		Liferay.CommerceContext.account = {
			accountId: 42,
		} as typeof Liferay.CommerceContext.account;
	});

	it('requests the project memberships with the role', () => {
		useFetchMock.mockReturnValue({data: undefined, isLoading: true});

		renderHook(() =>
			useProjectContacts('PRJCT-1', 'C_CRITICAL_INCIDENT_CONTACT')
		);

		const [[membershipsURL, {params}], [userAccountsURL]] =
			useFetchMock.mock.calls;

		expect(membershipsURL).toBe('/o/c/projectmemberships');
		expect(params.filter).toBe(
			"r_projectToProjectMembership_c_projectERC eq 'PRJCT-1' and roleExternalReferenceCode eq 'C_CRITICAL_INCIDENT_CONTACT'"
		);
		expect(userAccountsURL).toBe(
			'/o/headless-admin-user/v1.0/accounts/42/user-accounts'
		);
	});

	it('skips the requests without a project', () => {
		useFetchMock.mockReturnValue({data: undefined, isLoading: false});

		const {result} = renderHook(() =>
			useProjectContacts('', 'C_CRITICAL_INCIDENT_CONTACT')
		);

		expect(useFetchMock.mock.calls.map(([url]) => url)).toEqual([
			null,
			null,
		]);
		expect(result.current.contacts).toEqual([]);
	});

	it('returns the names of the account users with the role', () => {
		useFetchMock.mockImplementation((url: string) => ({
			data:
				url === '/o/c/projectmemberships'
					? {
							items: [
								{r_userToProjectMembership_userId: 1},
								{r_userToProjectMembership_userId: 3},
							],
						}
					: {
							items: [
								{id: 1, name: 'Ana'},
								{id: 2, name: 'Bo'},
								{id: 3, name: 'Cy'},
							],
						},
			isLoading: false,
		}));

		const {result} = renderHook(() =>
			useProjectContacts('PRJCT-1', 'C_CRITICAL_INCIDENT_CONTACT')
		);

		expect(result.current.contacts).toEqual(['Ana', 'Cy']);
	});
});
