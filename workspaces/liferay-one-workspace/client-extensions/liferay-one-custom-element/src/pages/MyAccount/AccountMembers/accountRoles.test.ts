/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	canAccessAccountMembers,
	canAccessOrders,
	canEditAccountDetails,
	getMembershipRoleNames,
	getRoleExternalReferenceCodes,
	hasAdministratorRole,
	hasAnyAccountRole,
	isAccountManager,
	isAdministratorRole,
	isPartnerRole,
	sortRoleNames,
} from './accountRoles';

import type {UserAccountModel} from '~/services/models/UserAccountModel';
import type {RoleBrief} from '~/types/accounts';

function toUserAccountModel(
	roleNames: string[],
	canManageAllAccounts = false
) {
	return {
		canManageAllAccounts,
		hasAccountRoleName: (roleName: string) => roleNames.includes(roleName),
	} as unknown as UserAccountModel;
}

function toRoleBriefs(roleNames: string[]) {
	return roleNames.map((name) => ({name})) as RoleBrief[];
}

describe('[MOD-MYACCOUNT-ACCOUNTMEMBERS-ACCOUNTROLES] accountRoles', () => {
	describe('sortRoleNames', () => {
		it('dedupes and orders by the manageable role list', () => {
			expect(
				sortRoleNames([
					'Partner Member',
					'Account Member',
					'Account Administrator',
					'Account Member',
				])
			).toEqual([
				'Account Administrator',
				'Account Member',
				'Partner Member',
			]);
		});

		it('drops role names that are not manageable', () => {
			expect(sortRoleNames(['Administrator', 'Account Buyer'])).toEqual([
				'Account Buyer',
			]);
		});

		it('returns an empty list without role names', () => {
			expect(sortRoleNames()).toEqual([]);
		});
	});

	describe('getMembershipRoleNames', () => {
		it('sorts the names of the role briefs', () => {
			expect(
				getMembershipRoleNames(
					toRoleBriefs(['Partner Manager', 'Account Buyer'])
				)
			).toEqual(['Account Buyer', 'Partner Manager']);
		});
	});

	describe('getRoleExternalReferenceCodes', () => {
		const roleExternalReferenceCodesByName = new Map([
			['Account Administrator', 'L_ACCOUNT_ADMINISTRATOR'],
			['Account Member', 'L_ACCOUNT_MEMBER'],
		]);

		it('maps every role name to its external reference code', () => {
			expect(
				getRoleExternalReferenceCodes(
					['Account Member', 'Account Administrator'],
					roleExternalReferenceCodesByName
				)
			).toEqual(['L_ACCOUNT_MEMBER', 'L_ACCOUNT_ADMINISTRATOR']);
		});

		it('returns null when any role name is unmapped', () => {
			expect(
				getRoleExternalReferenceCodes(
					['Account Member', 'Partner Member'],
					roleExternalReferenceCodesByName
				)
			).toBeNull();
		});
	});

	describe('isAccountManager', () => {
		it('is true for an Account Administrator', () => {
			expect(
				isAccountManager(toUserAccountModel(['Account Administrator']))
			).toBe(true);
		});

		it('is true for a Partner Account Admin', () => {
			expect(
				isAccountManager(toUserAccountModel(['Partner Account Admin']))
			).toBe(true);
		});

		it('is true for the platform admin', () => {
			expect(isAccountManager(toUserAccountModel([], true))).toBe(true);
		});

		it('is false for other roles and without a user', () => {
			expect(
				isAccountManager(toUserAccountModel(['Account Member']))
			).toBe(false);
			expect(isAccountManager(null)).toBe(false);
		});

		it('decides canEditAccountDetails the same way', () => {
			expect(
				canEditAccountDetails(
					toUserAccountModel(['Account Administrator'])
				)
			).toBe(true);
			expect(
				canEditAccountDetails(toUserAccountModel(['Account Buyer']))
			).toBe(false);
		});
	});

	describe('canAccessAccountMembers', () => {
		it('allows a manager even with the buyer role', () => {
			expect(
				canAccessAccountMembers(
					toUserAccountModel([
						'Account Administrator',
						'Account Buyer',
					])
				)
			).toBe(true);
		});

		it('denies a buyer who is not also a member', () => {
			expect(
				canAccessAccountMembers(toUserAccountModel(['Account Buyer']))
			).toBe(false);
		});

		it('allows a buyer who is also a member', () => {
			expect(
				canAccessAccountMembers(
					toUserAccountModel(['Account Buyer', 'Account Member'])
				)
			).toBe(true);
		});

		it('allows a user who is not a buyer', () => {
			expect(
				canAccessAccountMembers(toUserAccountModel(['Partner Member']))
			).toBe(true);
		});
	});

	describe('canAccessOrders', () => {
		it('allows a manager', () => {
			expect(canAccessOrders(toUserAccountModel([], true))).toBe(true);
		});

		it('allows any manageable role', () => {
			expect(
				canAccessOrders(toUserAccountModel(['Partner Sales User']))
			).toBe(true);
			expect(
				hasAnyAccountRole(toUserAccountModel(['Account Buyer']))
			).toBe(true);
		});

		it('denies a user without a manageable role', () => {
			expect(
				canAccessOrders(toUserAccountModel(['Account Requester']))
			).toBe(false);
			expect(canAccessOrders(undefined)).toBe(false);
		});
	});

	describe('role classification', () => {
		it('detects an administrator role among the role briefs', () => {
			expect(
				hasAdministratorRole(
					toRoleBriefs(['Account Member', 'Partner Account Admin'])
				)
			).toBe(true);
			expect(hasAdministratorRole(toRoleBriefs(['Account Member']))).toBe(
				false
			);
			expect(hasAdministratorRole()).toBe(false);
		});

		it('classifies administrator role names', () => {
			expect(isAdministratorRole('Account Administrator')).toBe(true);
			expect(isAdministratorRole('Partner Account Admin')).toBe(true);
			expect(isAdministratorRole('Partner Manager')).toBe(false);
		});

		it('classifies partner role names', () => {
			expect(isPartnerRole('Partner Technical User')).toBe(true);
			expect(isPartnerRole('Account Member')).toBe(false);
		});
	});
});
