/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import {UserAccountModel} from './UserAccountModel';

import type {UserAccount} from '~/types/accounts';

function createModel(
	userAccount: Record<string, unknown>,
	ssaAccountExternalReferenceCode?: string
) {
	return new UserAccountModel(
		userAccount as unknown as UserAccount,
		ssaAccountExternalReferenceCode
	);
}

function setCommerceAccountId(accountId?: number) {
	(Liferay.CommerceContext as {account?: {accountId: number}}).account =
		accountId === undefined ? undefined : {accountId};
}

describe('[CLIENT-MODELS-USERACCOUNTMODEL] UserAccountModel', () => {
	afterEach(() => {
		setCommerceAccountId();
	});

	it.each([
		['Administrator', 'isAdmin'],
		['Finance Administrator', 'isFinanceAdministrator'],
		['Liferay Staff', 'isLiferayStaff'],
		['Provisioning Administrator', 'isProvisioningAdministrator'],
	] as const)('reads the %s regular role into %s', (roleName, flag) => {
		expect(createModel({roleBriefs: [{name: roleName}]})[flag]).toBe(true);
		expect(createModel({roleBriefs: [{name: 'User'}]})[flag]).toBe(false);
	});

	it.each([
		['Administrator', true],
		['Finance Administrator', false],
		['Liferay Staff', false],
		['Provisioning Administrator', true],
		['User', false],
	] as const)(
		'reads whether the %s regular role manages all accounts',
		(roleName, canManageAllAccounts) => {
			expect(
				createModel({roleBriefs: [{name: roleName}]})
					.canManageAllAccounts
			).toBe(canManageAllAccounts);
		}
	);

	it.each([
		['Administrator', true],
		['Finance Administrator', true],
		['Liferay Staff', false],
		['Provisioning Administrator', true],
		['User', false],
	] as const)(
		'reads whether the %s regular role views all accounts',
		(roleName, canViewAllAccounts) => {
			expect(
				createModel({roleBriefs: [{name: roleName}]}).canViewAllAccounts
			).toBe(canViewAllAccounts);
		}
	);

	it('scopes the account roles to the current commerce account', () => {
		setCommerceAccountId(1);

		const userAccount = {
			accountBriefs: [
				{id: 1, roleBriefs: [{name: 'Account Administrator'}]},
				{id: 2, roleBriefs: [{name: 'Account Solution Publisher'}]},
			],
			roleBriefs: [],
		};

		expect(createModel(userAccount).isAccountAdministrator).toBe(true);
		expect(createModel(userAccount).isSolutionPublisher).toBe(false);
		expect(createModel(userAccount).hasAccountRoleName('Custom')).toBe(
			false
		);

		setCommerceAccountId(2);

		expect(createModel(userAccount).isAccountAdministrator).toBe(false);
		expect(createModel(userAccount).isSolutionPublisher).toBe(true);
		expect(
			createModel(userAccount).hasAccountRoleName(
				'Account Solution Publisher'
			)
		).toBe(true);
	});

	it('scopes the SSA roles to the SSA account external reference code', () => {
		setCommerceAccountId(1);

		const userAccount = {
			accountBriefs: [
				{
					externalReferenceCode: 'OTHER',
					id: 1,
					roleBriefs: [{name: 'SSA Administrator'}],
				},
				{
					externalReferenceCode: 'SSA',
					id: 2,
					roleBriefs: [{name: 'SSA User'}],
				},
			],
			roleBriefs: [],
		};

		expect(createModel(userAccount, 'SSA').isSSAAdmin).toBe(false);
		expect(createModel(userAccount, 'SSA').isSSAUser).toBe(true);
		expect(createModel(userAccount, 'OTHER').isSSAAdmin).toBe(true);
		expect(createModel(userAccount, 'OTHER').isSSAUser).toBe(false);
		expect(createModel(userAccount).isSSAUser).toBe(false);
	});

	it('returns true for SSA admin as an administrator', () => {
		expect(
			createModel({
				accountBriefs: [],
				roleBriefs: [{name: 'Administrator'}],
			}).isSSAAdmin
		).toBe(true);
	});

	it('returns empty defaults when the account briefs are missing', () => {
		setCommerceAccountId(1);

		const model = createModel(
			{name: 'Acme', roleBriefs: [], type: 'business'},
			'SSA'
		);

		expect(model.accountBriefs).toEqual([]);
		expect(model.accountName).toBe('Acme');
		expect(model.accountType).toBe('business');
		expect(model.isAccountAdministrator).toBe(false);
		expect(model.isSSAUser).toBe(false);
	});
});
