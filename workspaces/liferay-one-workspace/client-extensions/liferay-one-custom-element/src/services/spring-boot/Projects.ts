/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {OneSpringBootOAuth2} from './OAuth2Client';

import type {Designation} from '~/pages/MyAccount/ProjectMembers/types';
import type {APIResponse} from '~/types/api';
import type {PlacedOrder} from '~/types/orders';

class ProjectsOAuth2 extends OneSpringBootOAuth2 {
	async deleteContactRole(
		projectExternalReferenceCode: string,
		userId: number | string,
		contactRoleExternalReferenceCode: string
	) {
		return this.delete(
			`/${projectExternalReferenceCode}/user-accounts/${userId}` +
				`/contact-roles/${contactRoleExternalReferenceCode}`
		);
	}

	async deleteProjectMembership(
		projectExternalReferenceCode: string,
		userId: number | string,
		roleExternalReferenceCode: string
	) {
		return this.delete(
			`/${projectExternalReferenceCode}/user-accounts/${userId}` +
				`/account-roles/${roleExternalReferenceCode}`
		);
	}

	async getContactRoles(projectExternalReferenceCodes: string[]) {
		const searchParams = new URLSearchParams(
			projectExternalReferenceCodes.map(
				(projectExternalReferenceCode) => [
					'externalReferenceCodes',
					projectExternalReferenceCode,
				]
			)
		);

		return this.get<Record<string, Designation[]>>(
			`/contact-roles?${searchParams.toString()}`
		);
	}

	async getPlacedOrders(
		projectExternalReferenceCode: string,
		restrictFields?: string
	) {
		const searchParams = new URLSearchParams(
			restrictFields ? {restrictFields} : {}
		);

		return this.get<APIResponse<PlacedOrder>>(
			`/${projectExternalReferenceCode}/placed-orders` +
				`?${searchParams.toString()}`
		);
	}

	async getProjectEventHistory(
		endDate: string,
		granularity: string,
		projectExternalReferenceCode: string,
		startDate: string
	) {
		const searchParams = new URLSearchParams({
			endDate,
			granularity,
			startDate,
		});

		return this.get(
			`/${projectExternalReferenceCode}/usage/event-history` +
				`?${searchParams.toString()}`
		);
	}

	async getProjectEventUsage(
		endDate: string,
		projectExternalReferenceCode: string,
		startDate: string
	) {
		const searchParams = new URLSearchParams({endDate, startDate});

		return this.get(
			`/${projectExternalReferenceCode}/usage/event-summary` +
				`?${searchParams.toString()}`
		);
	}

	async getProjectUsage(
		productExternalReferenceCode: string,
		projectExternalReferenceCode: string
	) {
		const searchParams = new URLSearchParams({
			productExternalReferenceCode,
		});

		return this.get(
			`/${projectExternalReferenceCode}/usage?${searchParams.toString()}`
		);
	}

	async postContactRole(
		projectExternalReferenceCode: string,
		userId: number | string,
		contactRoleExternalReferenceCode: string
	) {
		return this.post(
			`/${projectExternalReferenceCode}/user-accounts/${userId}` +
				`/contact-roles/${contactRoleExternalReferenceCode}`
		);
	}

	async postProjectMembership(
		projectExternalReferenceCode: string,
		userId: number | string,
		roleExternalReferenceCode: string
	) {
		return this.post(
			`/${projectExternalReferenceCode}/user-accounts/${userId}` +
				`/account-roles/${roleExternalReferenceCode}`
		);
	}

	async postSyncToJSM(projectExternalReferenceCode: string) {
		return this.post(`/${projectExternalReferenceCode}/sync-to-jsm`);
	}

	async putProjectMembership(
		projectExternalReferenceCode: string,
		userId: number | string,
		roleExternalReferenceCode: string
	) {
		return this.put(
			`/${projectExternalReferenceCode}/user-accounts/${userId}` +
				`/account-roles/${roleExternalReferenceCode}`
		);
	}
}

const Projects = new ProjectsOAuth2('/projects');

export default Projects;
