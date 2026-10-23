/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	endsBeforeStart,
	getIds,
	getInspectedCollections,
	getLoadedIds,
	getOutsideReferenceIds,
	isComplete,
	toFinding,
	toNumber,
} from './accountFindingUtils';
import {getEntitlementChecks, getOrderChecks} from './commerceFindingUtils';

import type {
	AccountFinding,
	AccountFindingSeverity,
	AccountInspection,
} from '~/types/accountInspection';

const ACCOUNT_ADMINISTRATOR_ROLE_EXTERNAL_REFERENCE_CODE =
	'L_ACCOUNT_ADMINISTRATOR';

const ACCOUNT_STATUS_APPROVED = 0;

function getAccountType({account}: AccountInspection) {
	return account.customFields?.find(({name}) => name === 'AccountType')
		?.customValue?.data;
}

function getAccountChecks(inspection: AccountInspection): AccountFinding[] {
	const {account, users} = inspection;

	const accountIds = [account.id];

	const hasAccountAdministrator = users.items.some(({accountBriefs}) =>
		accountBriefs?.some(
			({id, roleBriefs}) =>
				id === account.id &&
				roleBriefs?.some(
					({externalReferenceCode}) =>
						externalReferenceCode ===
						ACCOUNT_ADMINISTRATOR_ROLE_EXTERNAL_REFERENCE_CODE
				)
		)
	);

	const usersLoaded = isComplete(users);

	return [
		...toFinding(
			'account',
			account.status === ACCOUNT_STATUS_APPROVED ? [] : accountIds,
			'the-account-is-not-active',
			'warning'
		),
		...toFinding(
			'account',
			getAccountType(inspection) ? [] : accountIds,
			'the-account-has-no-account-type',
			'info'
		),
		...toFinding(
			'account',
			usersLoaded && !users.items.length ? accountIds : [],
			'the-account-has-no-users',
			'warning'
		),
		...toFinding(
			'account',
			usersLoaded && users.items.length && !hasAccountAdministrator
				? accountIds
				: [],
			'the-account-has-no-account-administrator',
			'warning'
		),
	];
}

function getProjectMembershipChecks({
	related: {projectMemberships, projects},
	users,
}: AccountInspection): AccountFinding[] {
	const projectIds = getLoadedIds(projects);
	const userIds = getLoadedIds(users);

	const membershipKeys = new Set<string>();

	const duplicateIds = getIds(projectMemberships.items, (membership) => {
		const membershipKey = [
			membership.r_projectToProjectMembership_c_projectId,
			membership.r_userToProjectMembership_userId,
			membership.roleExternalReferenceCode,
		].join('/');

		if (membershipKeys.has(membershipKey)) {
			return true;
		}

		membershipKeys.add(membershipKey);

		return false;
	});

	const memberProjectIds = new Set(
		projectMemberships.items.map((membership) =>
			toNumber(membership.r_projectToProjectMembership_c_projectId)
		)
	);

	return [
		...toFinding(
			'projectMemberships',
			getOutsideReferenceIds(
				projectMemberships.items,
				'r_userToProjectMembership_userId',
				userIds
			),
			'project-memberships-reference-users-outside-the-account',
			'danger'
		),
		...toFinding(
			'projectMemberships',
			projectIds
				? getIds(
						projectMemberships.items,
						(membership) =>
							!projectIds.has(
								toNumber(
									membership.r_projectToProjectMembership_c_projectId
								)
							)
					)
				: [],
			'project-memberships-reference-projects-outside-the-account',
			'danger'
		),
		...toFinding(
			'projectMemberships',
			getIds(
				projectMemberships.items,
				({roleExternalReferenceCode}) => !roleExternalReferenceCode
			),
			'project-memberships-have-no-role',
			'warning'
		),
		...toFinding(
			'projectMemberships',
			duplicateIds,
			'project-memberships-are-duplicated',
			'warning'
		),
		...toFinding(
			'projects',
			!isComplete(projectMemberships)
				? []
				: getIds(projects.items, ({id}) => !memberProjectIds.has(id)),
			'projects-have-no-members',
			'warning'
		),
	];
}

function getProjectAndContractReferenceChecks({
	related,
}: AccountInspection): AccountFinding[] {
	const contractIds = getLoadedIds(related.contracts);
	const projectIds = getLoadedIds(related.projects);

	return [
		...toFinding(
			'contracts',
			getOutsideReferenceIds(
				related.contracts.items,
				'r_projectToContract_c_projectId',
				projectIds
			),
			'contracts-reference-projects-outside-the-account',
			'danger'
		),
		...toFinding(
			'contracts',
			getIds(related.contracts.items, endsBeforeStart),
			'contracts-end-before-they-start',
			'warning'
		),
		...toFinding(
			'entitlements',
			getOutsideReferenceIds(
				related.entitlements.items,
				'r_projectToEntitlement_c_projectId',
				projectIds
			),
			'entitlements-reference-projects-outside-the-account',
			'danger'
		),
		...toFinding(
			'entitlements',
			getOutsideReferenceIds(
				related.entitlements.items,
				'r_contractToEntitlement_c_contractId',
				contractIds
			),
			'entitlements-reference-contracts-outside-the-account',
			'danger'
		),
		...toFinding(
			'environments',
			getOutsideReferenceIds(
				related.environments.items,
				'r_projectToEnvironment_c_projectId',
				projectIds
			),
			'environments-reference-projects-outside-the-account',
			'danger'
		),
		...toFinding(
			'environments',
			getOutsideReferenceIds(
				related.environments.items,
				'r_contractToEnvironment_c_contractId',
				contractIds
			),
			'environments-reference-contracts-outside-the-account',
			'danger'
		),
		...toFinding(
			'activationKeys',
			getOutsideReferenceIds(
				related.activationKeys.items,
				'r_projectToActivationKey_c_projectId',
				projectIds
			),
			'activation-keys-reference-projects-outside-the-account',
			'danger'
		),
	];
}

function getLoadErrorChecks(inspection: AccountInspection): AccountFinding[] {
	return getInspectedCollections(inspection).flatMap(
		([collection, {error, truncated}]): AccountFinding[] => {
			if (error) {
				return [
					{
						collection,
						ids: [],
						message: 'the-records-could-not-be-loaded',
						severity: 'danger',
					},
				];
			}

			if (truncated) {
				return [
					{
						collection,
						ids: [],
						message: 'only-part-of-the-records-could-be-loaded',
						severity: 'warning',
					},
				];
			}

			return [];
		}
	);
}

function getProjectNameChecks({
	related: {projects},
}: AccountInspection): AccountFinding[] {
	const projectIdsByName = new Map<string, number[]>();

	projects.items.forEach(({id, name}) => {
		if (name) {
			projectIdsByName.set(String(name), [
				...(projectIdsByName.get(String(name)) ?? []),
				id,
			]);
		}
	});

	return toFinding(
		'projects',
		[...projectIdsByName.values()]
			.filter((projectIds) => projectIds.length > 1)
			.flat(),
		'projects-share-a-name',
		'warning'
	);
}

const SEVERITY_ORDER: AccountFindingSeverity[] = ['danger', 'warning', 'info'];

function getAccountFindings(inspection: AccountInspection): AccountFinding[] {
	return [
		...getLoadErrorChecks(inspection),
		...getAccountChecks(inspection),
		...getProjectMembershipChecks(inspection),
		...getProjectNameChecks(inspection),
		...getProjectAndContractReferenceChecks(inspection),
		...getOrderChecks(inspection),
		...getEntitlementChecks(inspection),
	].sort(
		(finding1, finding2) =>
			SEVERITY_ORDER.indexOf(finding1.severity) -
			SEVERITY_ORDER.indexOf(finding2.severity)
	);
}

export default getAccountFindings;
