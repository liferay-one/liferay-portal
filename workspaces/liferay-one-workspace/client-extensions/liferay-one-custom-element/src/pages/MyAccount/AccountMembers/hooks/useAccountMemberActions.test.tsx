/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, renderHook, screen} from '@testing-library/react';
import {ReactElement} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import {useAccountMemberActions} from './useAccountMemberActions';

import type {AccountMemberRow} from '~/pages/MyAccount/AccountMembers/types';

type ConfirmationOptions = {
	body: ReactElement;
	header: string;
	onConfirm: () => Promise<void>;
	status?: string;
};

const mocks = vi.hoisted(() => ({
	deleteInvitations: vi.fn(),
	deleteUserAccounts: vi.fn(),
	fetcher: vi.fn(),
	onClose: vi.fn(),
	onOpenModal: vi.fn(),
	openModal: vi.fn(),
	openToast: vi.fn(),
	postInvitationsResend: vi.fn(),
}));

vi.mock('~/hooks/useConfirmationModal', () => ({
	useConfirmationModal: () => ({openModal: mocks.openModal}),
}));

vi.mock('~/hooks/useModalContext', () => ({
	default: () => ({
		onClose: mocks.onClose,
		onOpenModal: mocks.onOpenModal,
	}),
}));

vi.mock(
	'~/pages/MyAccount/AccountMembers/components/EditPermissionsModal/EditPermissionsModal',
	() => ({default: () => null})
);

vi.mock(
	'~/pages/MyAccount/AccountMembers/components/InviteMemberModal/InviteMemberModal',
	() => ({default: () => null})
);

vi.mock('~/services/fetcher/fetcher', () => ({
	default: mocks.fetcher,
}));

vi.mock('~/services/spring-boot/Accounts', () => ({
	default: {
		deleteInvitations: mocks.deleteInvitations,
		deleteUserAccounts: mocks.deleteUserAccounts,
		postInvitationsResend: mocks.postInvitationsResend,
	},
}));

const member = {
	email: 'ann@x.com',
	id: 7,
	invitationIds: [31, 32],
	isAdministrator: false,
	isCurrentUser: false,
	name: 'Ann Lee',
	roleBriefs: [],
	roleNames: [],
	status: 'active',
} as AccountMemberRow;

function getActions({
	adminCount = 2,
	mutate = vi.fn().mockResolvedValue(undefined),
} = {}) {
	const {result} = renderHook(() =>
		useAccountMemberActions({
			accountExternalReferenceCode: 'ACCNT-1',
			accountId: 10,
			adminCount,
			mutate,
			projectNamesByExternalReferenceCode: {
				'PRJCT-1': 'Alpha',
				'PRJCT-2': 'Beta',
			},
			roleNames: ['Account Member'],
		})
	);

	return {actions: result.current, mutate};
}

function getConfirmation() {
	return mocks.openModal.mock.calls[0][0] as ConfirmationOptions;
}

describe('[HOOK-MYACCOUNT-ACCOUNTMEMBERS-USEACCOUNTMEMBERACTIONS] useAccountMemberActions', () => {
	beforeEach(() => {
		Object.values(mocks).forEach((mock) => mock.mockReset());

		vi.spyOn(Liferay.Util, 'openToast').mockImplementation(mocks.openToast);
	});

	it('opens the invite modal with the account ERC and the role names', () => {
		const {actions, mutate} = getActions();

		actions.openInviteModal();

		expect(mocks.onOpenModal.mock.calls[0][0].body.props).toEqual(
			expect.objectContaining({
				accountExternalReferenceCode: 'ACCNT-1',
				mutate,
				roleNames: ['Account Member'],
			})
		);
	});

	it('opens the edit permissions modal for the member', () => {
		const {actions} = getActions({adminCount: 3});

		actions.openEditPermissionsModal(member);

		expect(mocks.onOpenModal.mock.calls[0][0].body.props).toEqual(
			expect.objectContaining({
				adminCount: 3,
				memberName: 'Ann Lee',
				userId: 7,
			})
		);
	});

	it('blocks the removal of the last account administrator with a warning modal', async () => {
		const {actions} = getActions({adminCount: 1});

		await actions.openRemoveMemberModal({...member, isAdministrator: true});

		expect(mocks.onOpenModal).toHaveBeenCalledWith(
			expect.objectContaining({status: 'warning'})
		);
		expect(mocks.fetcher).not.toHaveBeenCalled();
		expect(mocks.openModal).not.toHaveBeenCalled();
	});

	it('shows the project names in the removal confirmation when the member has project memberships', async () => {
		mocks.fetcher.mockResolvedValue({
			items: [
				{r_projectToProjectMembership_c_projectERC: 'PRJCT-1'},
				{r_projectToProjectMembership_c_projectERC: 'PRJCT-404'},
				{r_projectToProjectMembership_c_projectERC: 'PRJCT-2'},
			],
		});

		const {actions} = getActions({adminCount: 1});

		await actions.openRemoveMemberModal(member);

		expect(mocks.fetcher).toHaveBeenCalledWith(
			`/o/c/projectmemberships?filter=${encodeURIComponent(
				"r_accountEntryToProjectMembership_accountEntryId eq '10' and r_userToProjectMembership_userId eq '7'"
			)}&pageSize=200`
		);

		render(getConfirmation().body);

		expect(screen.getByText(/Alpha, Beta/)).toBeInTheDocument();
		expect(getConfirmation().status).toBe('danger');
	});

	it('falls back to the plain removal confirmation without project memberships', async () => {
		mocks.fetcher.mockResolvedValue({items: []});

		const {actions} = getActions();

		await actions.openRemoveMemberModal(member);

		render(getConfirmation().body);

		expect(screen.getByText(/Ann Lee/)).toBeInTheDocument();
		expect(screen.queryByText(/Alpha/)).not.toBeInTheDocument();
	});

	it('shows an error toast and stops when the membership lookup fails', async () => {
		mocks.fetcher.mockRejectedValue(new Error('fail'));

		const {actions} = getActions();

		await actions.openRemoveMemberModal(member);

		expect(mocks.openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'danger'})
		);
		expect(mocks.openModal).not.toHaveBeenCalled();
	});

	it('deletes the member, mutates, and shows a success toast on confirm', async () => {
		mocks.fetcher.mockResolvedValue({items: []});
		mocks.deleteUserAccounts.mockResolvedValue({});

		const {actions, mutate} = getActions();

		await actions.openRemoveMemberModal(member);
		await getConfirmation().onConfirm();

		expect(mocks.deleteUserAccounts).toHaveBeenCalledWith('ACCNT-1', 7);
		expect(mutate).toHaveBeenCalled();
		expect(mocks.openToast).toHaveBeenCalledWith(
			expect.not.objectContaining({type: 'danger'})
		);
	});

	it('shows an error toast without mutating when the delete fails', async () => {
		mocks.fetcher.mockResolvedValue({items: []});
		mocks.deleteUserAccounts.mockRejectedValue(new Error('fail'));

		const {actions, mutate} = getActions();

		await actions.openRemoveMemberModal(member);
		await getConfirmation().onConfirm();

		expect(mutate).not.toHaveBeenCalled();
		expect(mocks.openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'danger'})
		);
	});

	it('resends every invitation, mutates, and shows a success toast', async () => {
		mocks.postInvitationsResend.mockResolvedValue({});

		const {actions, mutate} = getActions();

		actions.openResendInvitationModal(member);
		await getConfirmation().onConfirm();

		expect(mocks.postInvitationsResend.mock.calls).toEqual([
			['ACCNT-1', 31],
			['ACCNT-1', 32],
		]);
		expect(mutate).toHaveBeenCalled();
		expect(mocks.openToast).toHaveBeenCalledWith(
			expect.not.objectContaining({type: 'danger'})
		);
	});

	it('shows an error toast when the resend fails', async () => {
		mocks.postInvitationsResend.mockRejectedValue(new Error('fail'));

		const {actions, mutate} = getActions();

		actions.openResendInvitationModal(member);
		await getConfirmation().onConfirm();

		expect(mutate).not.toHaveBeenCalled();
		expect(mocks.openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'danger'})
		);
	});

	it('revokes every invitation, mutates, and shows a success toast', async () => {
		mocks.deleteInvitations.mockResolvedValue({});

		const {actions, mutate} = getActions();

		actions.openRevokeInvitationModal(member);
		await getConfirmation().onConfirm();

		expect(mocks.deleteInvitations.mock.calls).toEqual([
			['ACCNT-1', 31],
			['ACCNT-1', 32],
		]);
		expect(mutate).toHaveBeenCalled();
		expect(getConfirmation().status).toBe('danger');
	});

	it('shows an error toast when the revoke fails', async () => {
		mocks.deleteInvitations.mockRejectedValue(new Error('fail'));

		const {actions, mutate} = getActions();

		actions.openRevokeInvitationModal(member);
		await getConfirmation().onConfirm();

		expect(mutate).not.toHaveBeenCalled();
		expect(mocks.openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'danger'})
		);
	});
});
