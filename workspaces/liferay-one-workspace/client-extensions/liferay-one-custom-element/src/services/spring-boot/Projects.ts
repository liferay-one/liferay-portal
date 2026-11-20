/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import FetcherError from '~/services/fetcher/FetcherError';
import {downloadFile} from '~/utils/downloadFileUtils';

import {OneSpringBootOAuth2} from './OAuth2Client';

export type DXPActivationCode = {
	activationCode: string;
	activationMode: string;
	activationStatus: string;
	environmentId: string;
	installationId: string;
};

export type DXPActivationCodeType = {
	activationCodes: DXPActivationCode[];
	availableCount: number;
	endDate?: string;
	maxClusterNodes: number;
	startDate?: string;
	totalCount: number;
	type: string;
	unlimited: boolean;
	usedCount: number;
};

export type DXPActivationCodes = {
	environmentTypes: DXPActivationCodeType[];
};

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

	async downloadDXPOfflineActivationBundle(
		projectExternalReferenceCode: string,
		activationCode: string,
		dxpVersion: string,
		installationId: string
	) {
		const response = await this.post<Response>(
			`/${projectExternalReferenceCode}/dxp/offline-activation-bundle`,
			{activationCode, dxpVersion, installationId},
			{earlyReturn: true}
		);

		if (!response.ok) {
			throw this.toFetcherError(response);
		}

		await downloadFile(
			`${installationId}-${dxpVersion}-activation.zip`,
			response
		);
	}

	async getDXPActivationCodes(projectExternalReferenceCode: string) {
		return this.get<DXPActivationCodes>(
			`/${projectExternalReferenceCode}/dxp/activation-codes`
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

	async postDXPActivationCodes(
		projectExternalReferenceCode: string,
		type: string
	) {
		const response = await this.post<Response>(
			`/${projectExternalReferenceCode}/dxp/activation-codes`,
			{type},
			{earlyReturn: true}
		);

		if (!response.ok) {
			throw this.toFetcherError(response);
		}

		return (await response.json()) as DXPActivationCode & {type: string};
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

	private toFetcherError(response: Response) {
		const error = new FetcherError(
			'An error occurred while fetching the data.'
		);

		error.status = response.status;

		return error;
	}
}

const Projects = new ProjectsOAuth2('/projects');

export default Projects;
