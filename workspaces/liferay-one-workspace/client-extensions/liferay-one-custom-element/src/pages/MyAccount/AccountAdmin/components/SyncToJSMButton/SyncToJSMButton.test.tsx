/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import SyncToJSMButton from './SyncToJSMButton';

const mocks = vi.hoisted(() => ({
	account: {externalReferenceCode: 'ACCNT-1'} as
		| {externalReferenceCode: string}
		| undefined,
	canManageAccountAdmin: true,
	openToast: vi.fn(),
	postSyncToJSM: vi.fn(),
}));

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: () => ({
		userAccountModel: {
			canManageAccountAdmin: mocks.canManageAccountAdmin,
		},
	}),
}));

vi.mock('~/context/AccountContext', () => ({
	useAccount: () => ({account: mocks.account}),
}));

vi.mock('~/services/spring-boot/Accounts', () => ({
	default: {postSyncToJSM: mocks.postSyncToJSM},
}));

describe('[ROUTE-MY-ACCOUNT-ACCOUNT-ADMIN] SyncToJSMButton', () => {
	beforeEach(() => {
		mocks.account = {externalReferenceCode: 'ACCNT-1'};
		mocks.canManageAccountAdmin = true;

		vi.spyOn(Liferay.Util, 'openToast').mockImplementation(mocks.openToast);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders nothing before the account of the route resolves', () => {
		mocks.account = undefined;

		const {container} = render(<SyncToJSMButton />);

		expect(container).toBeEmptyDOMElement();
	});

	it('turns the button off for a user who cannot manage the admin tab', () => {
		mocks.canManageAccountAdmin = false;

		render(<SyncToJSMButton />);

		expect(
			screen.getByRole('button', {name: 'Sync to JSM'})
		).toBeDisabled();
	});

	it('syncs the account to JSM', async () => {
		mocks.postSyncToJSM.mockResolvedValue(undefined);

		render(<SyncToJSMButton />);

		fireEvent.click(screen.getByRole('button', {name: 'Sync to JSM'}));

		await waitFor(() =>
			expect(mocks.openToast).toHaveBeenCalledWith(
				expect.objectContaining({type: 'success'})
			)
		);

		expect(mocks.postSyncToJSM).toHaveBeenCalledWith('ACCNT-1');
	});

	it('reports a failed sync', async () => {
		mocks.postSyncToJSM.mockRejectedValue({info: {title: 'Forbidden'}});

		render(<SyncToJSMButton />);

		fireEvent.click(screen.getByRole('button', {name: 'Sync to JSM'}));

		await waitFor(() =>
			expect(mocks.openToast).toHaveBeenCalledWith({
				message: 'Forbidden',
				type: 'danger',
			})
		);
	});
});
