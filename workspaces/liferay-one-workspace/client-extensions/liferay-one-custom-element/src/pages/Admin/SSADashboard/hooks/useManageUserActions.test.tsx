/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	fireEvent,
	render,
	renderHook,
	screen,
	waitFor,
} from '@testing-library/react';
import {ReactElement, ReactNode} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import useManageUserActions from './useManageUserActions';

import type {UserAccount} from '~/types/accounts';
import type {APIResponse} from '~/types/api';

const mocks = vi.hoisted(() => ({
	onClose: vi.fn(),
	onOpenModal: vi.fn(),
	putUserAccountsAccountRoles: vi.fn(),
}));

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: () => ({
		properties: {ssaAccountExternalReferenceCode: 'SSA_ACCOUNT'},
	}),
}));

vi.mock('~/hooks/useModalContext', () => ({
	default: () => ({
		onClose: mocks.onClose,
		onOpenModal: mocks.onOpenModal,
	}),
}));

vi.mock('~/pages/Admin/SSADashboard/components/ManageUserRolesModal', () => ({
	default: () => null,
}));

vi.mock('~/services/spring-boot/Accounts', () => ({
	default: {
		putUserAccountsAccountRoles: mocks.putUserAccountsAccountRoles,
	},
}));

const userAccount = {
	accountBriefs: [
		{
			externalReferenceCode: 'SSA_ACCOUNT',
			roleBriefs: [
				{id: 1, name: 'SSA Administrator'},
				{id: 2, name: 'Account Member'},
				{id: 3, name: 'SSA User'},
			],
		},
		{
			externalReferenceCode: 'OTHER_ACCOUNT',
			roleBriefs: [{id: 4, name: 'Account Member'}],
		},
	],
	id: 7,
} as unknown as UserAccount;

function getActions() {
	const {result} = renderHook(() => useManageUserActions());

	return result.current;
}

function getModalPayload() {
	return mocks.onOpenModal.mock.calls[0][0] as {
		body: ReactElement;
		footer: ReactNode[];
		header: unknown;
		status?: string;
	};
}

function openRemoveAllRoles(mutate = vi.fn()) {
	getActions()[1].onClick!(userAccount, mutate);

	render(<>{getModalPayload().footer}</>);

	fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

	return mutate;
}

describe('[HOOK-ADMIN-SSADASHBOARD-USEMANAGEUSERACTIONS] useManageUserActions', () => {
	beforeEach(() => {
		mocks.onClose.mockReset();
		mocks.onOpenModal.mockReset();
		mocks.putUserAccountsAccountRoles.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('opens the manage roles modal with the SSA account ERC', () => {
		const mutate = vi.fn();

		getActions()[0].onClick!(userAccount, mutate);

		const {body} = getModalPayload();

		expect(body.props).toEqual(
			expect.objectContaining({
				accountERC: 'SSA_ACCOUNT',
				mutate,
				onClose: mocks.onClose,
				user: userAccount,
			})
		);
	});

	it('removes only the SSA role ids, clears the cached roles without revalidating, and closes the modal', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');

		mocks.putUserAccountsAccountRoles.mockResolvedValue({});

		const mutate = openRemoveAllRoles();

		expect(getModalPayload().status).toBe('warning');

		await waitFor(() => expect(mocks.onClose).toHaveBeenCalled());

		expect(mocks.putUserAccountsAccountRoles).toHaveBeenCalledWith(
			'SSA_ACCOUNT',
			7,
			[2]
		);
		expect(openToast).toHaveBeenCalledWith(
			expect.not.objectContaining({type: 'danger'})
		);
		expect(mutate).toHaveBeenCalledWith(expect.any(Function), {
			revalidate: false,
		});

		const updater = mutate.mock.calls[0][0] as (
			page: APIResponse<UserAccount>
		) => APIResponse<UserAccount>;

		const otherUser = {accountBriefs: [], id: 8} as unknown as UserAccount;

		const page = updater({
			items: [userAccount, otherUser],
			totalCount: 2,
		} as APIResponse<UserAccount>);

		expect(page.totalCount).toBe(2);
		expect(page.items[1]).toBe(otherUser);
		expect(page.items[0].accountBriefs).toEqual([
			{externalReferenceCode: 'SSA_ACCOUNT', roleBriefs: []},
			userAccount.accountBriefs[1],
		]);
	});

	it('shows an error toast and keeps the modal open when the removal fails', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');

		mocks.putUserAccountsAccountRoles.mockRejectedValue(new Error('fail'));

		const mutate = openRemoveAllRoles();

		await waitFor(() =>
			expect(openToast).toHaveBeenCalledWith(
				expect.objectContaining({type: 'danger'})
			)
		);

		expect(mutate).not.toHaveBeenCalled();
		expect(mocks.onClose).not.toHaveBeenCalled();
	});
});
