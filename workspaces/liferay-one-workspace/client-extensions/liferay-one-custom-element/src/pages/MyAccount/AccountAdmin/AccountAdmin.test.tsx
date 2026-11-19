/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import AccountAdmin from './AccountAdmin';

const mocks = vi.hoisted(() => ({
	canViewAccountAdmin: true,
	myUserAccount: {id: 1} as {id: number} | undefined,
}));

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: () => ({
		myUserAccount: mocks.myUserAccount,
		userAccountModel: {canViewAccountAdmin: mocks.canViewAccountAdmin},
	}),
}));

vi.mock(
	'~/pages/MyAccount/AccountAdmin/components/LicensingSettings/LicensingSettings',
	() => ({default: () => <span>LicensingSettings</span>})
);

vi.mock('~/pages/MyAccount/AccountAdmin/components/JSMSync/JSMSync', () => ({
	default: () => <span>JSMSync</span>,
}));

describe('[ROUTE-MY-ACCOUNT-ACCOUNT-ADMIN] AccountAdmin', () => {
	beforeEach(() => {
		mocks.canViewAccountAdmin = true;
		mocks.myUserAccount = {id: 1};
	});

	it('shows neither card before the user account loads', () => {
		mocks.myUserAccount = undefined;

		render(<AccountAdmin />);

		expect(screen.queryByText('JSMSync')).not.toBeInTheDocument();
		expect(screen.queryByText('LicensingSettings')).not.toBeInTheDocument();
	});

	it('shows the JSM sync card and the licensing settings card', () => {
		render(<AccountAdmin />);

		expect(screen.getByText('JSMSync')).toBeInTheDocument();
		expect(screen.getByText('LicensingSettings')).toBeInTheDocument();
	});

	it('refuses a user who cannot view the admin tab', () => {
		mocks.canViewAccountAdmin = false;

		render(<AccountAdmin />);

		expect(
			screen.getByText('You do not have access to this page.')
		).toBeInTheDocument();
		expect(screen.queryByText('JSMSync')).not.toBeInTheDocument();
		expect(screen.queryByText('LicensingSettings')).not.toBeInTheDocument();
	});
});
