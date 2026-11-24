/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import AccountMembers from './AccountMembers';

const mocks = vi.hoisted(() => ({
	useAccountType: vi.fn(),
	useHasProject: vi.fn(),
}));

vi.mock('~/components/Page/Page', () => ({
	default: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));

vi.mock(
	'~/components/RestrictedFeatureMessage/RestrictedFeatureMessage',
	() => ({
		default: () => <div>restricted-feature</div>,
	})
);

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: () => ({myUserAccount: {id: 1}, userAccountModel: {}}),
}));

vi.mock('~/pages/MyAccount/AccountMembers/accountRoles', () => ({
	canAccessAccountMembers: () => true,
	canManageAccountMembers: () => true,
}));

vi.mock(
	'~/pages/MyAccount/AccountMembers/hooks/useAccountMemberActions',
	() => ({
		useAccountMemberActions: () => ({}),
	})
);

vi.mock('~/pages/MyAccount/AccountMembers/hooks/useAccountMembers', () => ({
	useAccountMembers: () => ({
		account: {externalReferenceCode: 'ACCNT-1', id: 1},
		error: undefined,
		loading: false,
		mutate: vi.fn(),
		projectNamesByExternalReferenceCode: new Map(),
		rows: [],
	}),
}));

vi.mock('~/pages/MyAccount/AccountMembers/hooks/useAccountType', () => ({
	useAccountType: mocks.useAccountType,
}));

vi.mock('~/pages/MyAccount/Projects/hooks/useHasProject', () => ({
	useHasProject: mocks.useHasProject,
}));

function setUp({
	accountTypeLoading = false,
	hasActivePartnerSubscription = false,
	hasProject = false,
	projectsLoading = false,
}) {
	mocks.useAccountType.mockReturnValue({
		hasActivePartnerSubscription,
		loading: accountTypeLoading,
		roleNames: [],
	});
	mocks.useHasProject.mockReturnValue({
		hasProject,
		loading: projectsLoading,
	});
}

describe('[ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS] AccountMembers', () => {
	beforeEach(() => {
		mocks.useAccountType.mockReset();
		mocks.useHasProject.mockReset();
	});

	it('restricts an account with no project and no active partner subscription', () => {
		setUp({});

		render(<AccountMembers />);

		expect(screen.getByText('restricted-feature')).toBeInTheDocument();
	});

	it('opens the members of a partner account with an active partner subscription and no project', () => {
		setUp({hasActivePartnerSubscription: true});

		render(<AccountMembers />);

		expect(
			screen.queryByText('restricted-feature')
		).not.toBeInTheDocument();
	});

	it('opens the members of an account with a project', () => {
		setUp({hasProject: true});

		render(<AccountMembers />);

		expect(
			screen.queryByText('restricted-feature')
		).not.toBeInTheDocument();
	});

	it.each([
		[true, false],
		[false, true],
	])(
		'does not restrict the account while the account type loading is %s and the projects loading is %s',
		(accountTypeLoading, projectsLoading) => {
			setUp({accountTypeLoading, projectsLoading});

			render(<AccountMembers />);

			expect(
				screen.queryByText('restricted-feature')
			).not.toBeInTheDocument();
		}
	);
});
