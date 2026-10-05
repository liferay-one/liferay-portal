/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	PROJECT_ADMIN_ERC,
	PROJECT_REQUESTER_ERC,
	PROJECT_USER_ERC,
	getProductContactRoleExternalReferenceCodes,
	getProjectRoleLabel,
} from './projectRoles';

import type {DeliveryProductSpecification} from '~/types/product';

function toSpecifications(value?: string) {
	return (value === undefined
		? [{specificationKey: 'other', value: 'C_X'}]
		: [
				{specificationKey: 'project-contacts-role-ercs', value},
			]) as unknown as DeliveryProductSpecification[];
}

describe('[MOD-MYACCOUNT-PROJECTMEMBERS-PROJECTROLES] projectRoles', () => {
	it('labels the three project role ERCs', () => {
		expect(getProjectRoleLabel(PROJECT_ADMIN_ERC)).toBe('Admin');
		expect(getProjectRoleLabel(PROJECT_REQUESTER_ERC)).toBe('Requester');
		expect(getProjectRoleLabel(PROJECT_USER_ERC)).toBe('User');
	});

	it('returns an empty label for an unknown ERC', () => {
		expect(getProjectRoleLabel('C_UNKNOWN')).toBe('');
	});

	it('splits, trims, and drops empty contact role ERCs', () => {
		expect(
			getProductContactRoleExternalReferenceCodes(
				toSpecifications(' C_A , ,C_B,,  C_C ')
			)
		).toEqual(['C_A', 'C_B', 'C_C']);
	});

	it('returns an empty array when the specification is absent', () => {
		expect(
			getProductContactRoleExternalReferenceCodes(toSpecifications())
		).toEqual([]);
		expect(getProductContactRoleExternalReferenceCodes([])).toEqual([]);
	});
});
