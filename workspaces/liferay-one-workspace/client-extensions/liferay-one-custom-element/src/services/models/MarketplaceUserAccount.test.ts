/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import {MarketplaceUserAccount} from './MarketplaceUserAccount';

import type {UserAccount} from '~/types/accounts';

function createModel(userAccount: Record<string, unknown>) {
	return new MarketplaceUserAccount(userAccount as unknown as UserAccount);
}

function setCommerceAccountId(accountId?: number) {
	(Liferay.CommerceContext as {account?: {accountId: number}}).account =
		accountId === undefined ? undefined : {accountId};
}

describe('[CLIENT-MODELS-MARKETPLACEUSERACCOUNT] MarketplaceUserAccount', () => {
	afterEach(() => {
		setCommerceAccountId();
	});

	it('reads isAdmin from the regular roles', () => {
		expect(
			createModel({roleBriefs: [{name: 'Administrator'}]}).isAdmin
		).toBe(true);
		expect(createModel({roleBriefs: [{name: 'User'}]}).isAdmin).toBe(false);
	});

	it('reads the account roles from the current commerce account only', () => {
		setCommerceAccountId(1);

		const userAccount = {
			accountBriefs: [
				{id: 1, roleBriefs: [{name: 'Account Solution Publisher'}]},
				{id: 2, roleBriefs: [{name: 'SSA User'}]},
			],
			roleBriefs: [],
		};

		expect(createModel(userAccount).isSolutionPublisher).toBe(true);
		expect(createModel(userAccount).isSSAUser).toBe(false);

		setCommerceAccountId(2);

		expect(createModel(userAccount).isSolutionPublisher).toBe(false);
		expect(createModel(userAccount).isSSAUser).toBe(true);
	});

	it('returns false for the account roles when no commerce account is selected', () => {
		const model = createModel({
			accountBriefs: [{id: 1, roleBriefs: [{name: 'SSA User'}]}],
			roleBriefs: [],
		});

		expect(model.isSSAUser).toBe(false);
	});

	it('returns true for SSA admin with the SSA admin role or as an administrator', () => {
		setCommerceAccountId(1);

		expect(
			createModel({
				accountBriefs: [
					{id: 1, roleBriefs: [{name: 'SSA Administrator'}]},
				],
				roleBriefs: [],
			}).isSSAAdmin
		).toBe(true);
		expect(
			createModel({
				accountBriefs: [],
				roleBriefs: [{name: 'Administrator'}],
			}).isSSAAdmin
		).toBe(true);
		expect(
			createModel({
				accountBriefs: [{id: 1, roleBriefs: [{name: 'SSA User'}]}],
				roleBriefs: [],
			}).isSSAAdmin
		).toBe(false);
	});

	it('returns the account fields and empty briefs by default', () => {
		const model = createModel({
			name: 'Acme',
			roleBriefs: [],
			type: 'business',
		});

		expect(model.accountBriefs).toEqual([]);
		expect(model.accountName).toBe('Acme');
		expect(model.accountType).toBe('business');
	});
});
