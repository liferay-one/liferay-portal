/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import {useProjectContacts} from './useProjectContacts';

const {useFetchMock} = vi.hoisted(() => ({useFetchMock: vi.fn()}));

vi.mock('~/hooks/useFetch', () => ({useFetch: useFetchMock}));

const CONTACT_ROLE = 'C_SECURITY_INCIDENT_CONTACT';

function membership(userId: number, roleExternalReferenceCode: string) {
	return {
		r_userToProjectMembership_userId: userId,
		roleExternalReferenceCode,
	};
}

function mockResponses(
	memberships: ReturnType<typeof membership>[],
	userAccounts = [
		{id: 1, name: 'Ana'},
		{id: 2, name: 'Bo'},
		{id: 3, name: 'Cy'},
	]
) {
	useFetchMock.mockImplementation((url: string | null) => ({
		data:
			url === '/o/c/projectmemberships'
				? {items: memberships}
				: url
					? {items: userAccounts}
					: undefined,
		isLoading: false,
	}));
}

describe('[HOOK-USEPROJECTCONTACTS] useProjectContacts', () => {
	beforeEach(() => {
		useFetchMock.mockReset();

		Liferay.CommerceContext.account = {
			accountId: 42,
		} as typeof Liferay.CommerceContext.account;
	});

	it('requests the project memberships with the role and the project roles', () => {
		useFetchMock.mockReturnValue({data: undefined, isLoading: true});

		renderHook(() => useProjectContacts('PRJCT-1', CONTACT_ROLE));

		const [[membershipsURL, {params}]] = useFetchMock.mock.calls;

		expect(membershipsURL).toBe('/o/c/projectmemberships');
		expect(params.filter).toBe(
			"r_projectToProjectMembership_c_projectERC eq 'PRJCT-1' and roleExternalReferenceCode in ('C_SECURITY_INCIDENT_CONTACT','C_PROJECT_ADMIN','C_PROJECT_REQUESTER','C_PROJECT_USER')"
		);
	});

	it('skips the requests without a project', () => {
		useFetchMock.mockReturnValue({data: undefined, isLoading: false});

		const {result} = renderHook(() => useProjectContacts('', CONTACT_ROLE));

		expect(useFetchMock.mock.calls.map(([url]) => url)).toEqual([
			null,
			null,
		]);
		expect(result.current.contacts).toEqual([]);
	});

	it('skips the user request when no member holds the role', () => {
		mockResponses([membership(1, 'C_PROJECT_USER')]);

		const {result} = renderHook(() =>
			useProjectContacts('PRJCT-1', CONTACT_ROLE)
		);

		expect(useFetchMock.mock.calls.at(-1)?.[0]).toBeNull();
		expect(result.current.contacts).toEqual([]);
	});

	it('returns the names of the project members with the role', () => {
		mockResponses([
			membership(1, 'C_PROJECT_ADMIN'),
			membership(1, CONTACT_ROLE),
			membership(3, 'C_PROJECT_USER'),
			membership(3, CONTACT_ROLE),
		]);

		const {result} = renderHook(() =>
			useProjectContacts('PRJCT-1', CONTACT_ROLE)
		);

		expect(useFetchMock.mock.calls.at(-1)?.[0]).toBe(
			'/o/headless-admin-user/v1.0/accounts/42/user-accounts'
		);
		expect(result.current.contacts).toEqual(['Ana', 'Cy']);
	});

	it('leaves out a contact who no longer holds a project role', () => {
		mockResponses([
			membership(1, 'C_PROJECT_USER'),
			membership(1, CONTACT_ROLE),
			membership(2, CONTACT_ROLE),
		]);

		const {result} = renderHook(() =>
			useProjectContacts('PRJCT-1', CONTACT_ROLE)
		);

		expect(result.current.contacts).toEqual(['Ana']);
	});
});
