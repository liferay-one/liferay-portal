/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import AccountTabsLayout from './AccountTabsLayout';

const mocks = vi.hoisted(() => ({canViewAccountAdmin: true}));

vi.mock('~/components/Header/Header', () => ({Header: () => null}));

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: () => ({
		userAccountModel: {canViewAccountAdmin: mocks.canViewAccountAdmin},
	}),
}));

vi.mock('~/pages/MyAccount/AccountMembers/accountRoles', () => ({
	canAccessAccountMembers: () => true,
}));

function renderAt(pathname: string) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Routes>
				<Route element={<AccountTabsLayout />} path="/:accountERC">
					<Route element="AccountAdmin page" path="account-admin" />
					<Route
						element="AccountDetails page"
						path="account-details"
					/>
				</Route>
			</Routes>
		</MemoryRouter>
	);
}

describe('[ROUTE-MY-ACCOUNT-ACCOUNT-ADMIN] AccountTabsLayout', () => {
	beforeEach(() => {
		mocks.canViewAccountAdmin = true;
	});

	it('shows the Admin tab after Project Permissions to a user who can view it', () => {
		renderAt('/ACCNT-1/account-details');

		expect(
			screen.getAllByRole('tab').map((tab) => tab.textContent)
		).toEqual(['Details', 'Members', 'Project Permissions', 'Admin']);
	});

	it('hides the Admin tab from a user who cannot view it', () => {
		mocks.canViewAccountAdmin = false;

		renderAt('/ACCNT-1/account-details');

		expect(
			screen.queryByRole('tab', {name: 'Admin'})
		).not.toBeInTheDocument();
	});

	it('selects the Admin tab on the account-admin path', () => {
		renderAt('/ACCNT-1/account-admin');

		expect(screen.getByRole('tab', {name: 'Admin'})).toHaveAttribute(
			'aria-selected',
			'true'
		);
		expect(screen.getByText('AccountAdmin page')).toBeInTheDocument();
	});
});
