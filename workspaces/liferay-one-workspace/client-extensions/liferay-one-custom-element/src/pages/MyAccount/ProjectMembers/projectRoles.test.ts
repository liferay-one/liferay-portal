/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	PROJECT_ADMIN_ERC,
	PROJECT_REQUESTER_ERC,
	PROJECT_USER_ERC,
	getContactRoleChanges,
	getDesignationNames,
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

const AVAILABLE_DESIGNATIONS = [
	{
		externalReferenceCode: 'C_CRITICAL_INCIDENT_CONTACT',
		name: 'Critical Incident Contact',
	},
	{
		externalReferenceCode: 'C_DATA_BREACH_CONTACT',
		name: 'Data Breach Contact',
	},
];

describe('[MOD-MYACCOUNT-PROJECTMEMBERS-PROJECTROLES] projectRoles', () => {
	it('assigns and unassigns only the contact roles that changed', () => {
		expect(
			getContactRoleChanges(AVAILABLE_DESIGNATIONS, [
				{
					designations: ['C_CRITICAL_INCIDENT_CONTACT'],
					originalDesignations: ['C_DATA_BREACH_CONTACT'],
					removed: false,
					userId: 10,
				},
				{
					designations: ['C_CRITICAL_INCIDENT_CONTACT'],
					originalDesignations: ['C_CRITICAL_INCIDENT_CONTACT'],
					removed: false,
					userId: 11,
				},
			])
		).toEqual([
			{
				assigned: true,
				contactRoleExternalReferenceCode: 'C_CRITICAL_INCIDENT_CONTACT',
				userId: 10,
			},
			{
				assigned: false,
				contactRoleExternalReferenceCode: 'C_DATA_BREACH_CONTACT',
				userId: 10,
			},
		]);
	});

	it('ignores contact roles the project does not offer', () => {
		expect(
			getContactRoleChanges(AVAILABLE_DESIGNATIONS, [
				{
					designations: ['C_PAAS_USER'],
					originalDesignations: [],
					removed: false,
					userId: 10,
				},
			])
		).toEqual([]);
	});

	it('skips removed members and members with no user', () => {
		expect(
			getContactRoleChanges(AVAILABLE_DESIGNATIONS, [
				{
					designations: [],
					originalDesignations: ['C_CRITICAL_INCIDENT_CONTACT'],
					removed: true,
					userId: 10,
				},
				{
					designations: ['C_CRITICAL_INCIDENT_CONTACT'],
					originalDesignations: [],
					removed: false,
					userId: 0,
				},
			])
		).toEqual([]);
	});

	it('names the designations in the order the project offers them', () => {
		expect(
			getDesignationNames(AVAILABLE_DESIGNATIONS, [
				'C_DATA_BREACH_CONTACT',
				'C_PAAS_USER',
				'C_CRITICAL_INCIDENT_CONTACT',
			])
		).toEqual(['Critical Incident Contact', 'Data Breach Contact']);
	});

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
