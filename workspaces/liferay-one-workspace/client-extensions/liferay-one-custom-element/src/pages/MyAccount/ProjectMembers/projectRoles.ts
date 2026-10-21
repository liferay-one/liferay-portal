/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {Designation} from '~/pages/MyAccount/ProjectMembers/types';
import type {DeliveryProductSpecification} from '~/types/product';

export const PROJECT_ADMIN_ERC = 'C_PROJECT_ADMIN';
export const PROJECT_REQUESTER_ERC = 'C_PROJECT_REQUESTER';
export const PROJECT_USER_ERC = 'C_PROJECT_USER';

export const SECURITY_INCIDENT_CONTACT_ERC = 'C_SECURITY_INCIDENT_CONTACT';

export const PROJECT_ROLE_ERCS = [
	PROJECT_ADMIN_ERC,
	PROJECT_REQUESTER_ERC,
	PROJECT_USER_ERC,
];

export const PROJECT_ROLE_LABELS: Record<string, string> = {
	[PROJECT_ADMIN_ERC]: 'Admin',
	[PROJECT_REQUESTER_ERC]: 'Requester',
	[PROJECT_USER_ERC]: 'User',
};

export type ContactRoleChange = {
	assigned: boolean;
	contactRoleExternalReferenceCode: string;
	userId: number;
};

type DesignatedMember = {
	designations: string[];
	originalDesignations: string[];
	removed: boolean;
	userId: number;
};

export function getContactRoleChanges(
	availableDesignations: Designation[],
	members: DesignatedMember[]
): ContactRoleChange[] {
	const contactRoleChanges: ContactRoleChange[] = [];

	for (const member of members) {
		if (member.removed || !member.userId) {
			continue;
		}

		for (const {externalReferenceCode} of availableDesignations) {
			const assigned = member.designations.includes(
				externalReferenceCode
			);

			if (
				assigned !==
				member.originalDesignations.includes(externalReferenceCode)
			) {
				contactRoleChanges.push({
					assigned,
					contactRoleExternalReferenceCode: externalReferenceCode,
					userId: member.userId,
				});
			}
		}
	}

	return contactRoleChanges;
}

export function getDesignationNames(
	availableDesignations: Designation[],
	designations: string[]
) {
	return availableDesignations
		.filter(({externalReferenceCode}) =>
			designations.includes(externalReferenceCode)
		)
		.map(({name}) => name);
}

export function getProjectRoleLabel(roleExternalReferenceCode: string) {
	return PROJECT_ROLE_LABELS[roleExternalReferenceCode] ?? '';
}

const CONTACTS_ROLE_ERCS_SPECIFICATION_KEY = 'project-contacts-role-ercs';

export function getProductContactRoleExternalReferenceCodes(
	specifications: DeliveryProductSpecification[]
): string[] {
	const value =
		specifications.find(
			(specification) =>
				specification.specificationKey ===
				CONTACTS_ROLE_ERCS_SPECIFICATION_KEY
		)?.value ?? '';

	return value
		.split(',')
		.map((externalReferenceCode) => externalReferenceCode.trim())
		.filter(Boolean);
}
