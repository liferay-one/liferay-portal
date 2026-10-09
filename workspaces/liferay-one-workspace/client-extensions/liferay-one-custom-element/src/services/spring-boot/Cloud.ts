/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import FetcherError from '~/services/fetcher/FetcherError';
import {downloadFile} from '~/utils/downloadFileUtils';

import {OneSpringBootOAuth2} from './OAuth2Client';

export type CloudActivatedEnvironment = {
	environmentId: string;
};

export type CloudEnvironmentActivationCode = {
	activationCode: string;
	activationStatus: string;
	environmentId: string;
	environmentName: string;
};

export type CloudEnvironmentActivationCodeType = {
	activationCodes: CloudEnvironmentActivationCode[];
	availableCount: number;
	maxClusterNodes: number;
	totalCount: number;
	type: string;
	unlimited: boolean;
	usedCount: number;
};

export type CloudEnvironmentActivationCodes = {
	environmentTypes: CloudEnvironmentActivationCodeType[];
};

export type CloudGeneratedActivationCode = CloudEnvironmentActivationCode & {
	type: string;
};

export type CloudEnvironmentSubscription = {
	entitlementId: number;
	name: string;
	productExternalReferenceCode: string;
};

export type CloudEnvironmentSubscriptions = {
	subscriptions: CloudEnvironmentSubscription[];
};

export type CloudOfflineEnvironment = {
	bundledEntitlementIds: number[];
	environmentId: string;
	environmentName: string;
	requestedVersion: string;
	type: string;
};

export type CloudOfflineEnvironments = {
	environments: CloudOfflineEnvironment[];
};

class CloudOAuth2 extends OneSpringBootOAuth2 {
	async downloadOfflineActivationBundle(
		dxpVersion: string,
		environmentId: string,
		entitlementIds: number[] = []
	) {
		const response = await this.post<Response>(
			`/environments/${environmentId}/offline-activation-bundle`,
			{dxpVersion, entitlementIds},
			{earlyReturn: true}
		);

		if (!response.ok) {
			throw this.toFetcherError(response);
		}

		await downloadFile(
			`${environmentId}-${dxpVersion}-offline-activation-bundle.zip`,
			response
		);
	}

	async getEnvironmentsEntitlements(environmentId: string) {
		return this.get<CloudEnvironmentSubscriptions>(
			`/environments/${environmentId}/entitlements`
		);
	}

	async getProjectsEntitlementsDisasterRecovery(
		projectExternalReferenceCode: string
	) {
		return this.get<{hasDisasterRecoveryEntitlement: boolean}>(
			`/projects/${projectExternalReferenceCode}/entitlements` +
				'/disaster-recovery'
		);
	}

	async getProjectsEnvironmentsActivationCodes(
		projectExternalReferenceCode: string
	) {
		return this.get<CloudEnvironmentActivationCodes>(
			`/projects/${projectExternalReferenceCode}/environments` +
				'/activation-codes'
		);
	}

	async getProjectsEnvironmentsOffline(projectExternalReferenceCode: string) {
		return this.get<CloudOfflineEnvironments>(
			`/projects/${projectExternalReferenceCode}/environments/offline`
		);
	}

	async offlineActivation(activationCode: string, token: string) {
		const response = await this.post<Response>(
			'/environments/offline-activation',
			{activationCode, token},
			{earlyReturn: true}
		);

		if (!response.ok) {
			throw this.toFetcherError(response);
		}

		const {environmentId} =
			(await response.json()) as CloudActivatedEnvironment;

		return environmentId;
	}

	async postEnvironmentsActivationRequest(
		environmentProfile: string,
		fields: Record<string, unknown>,
		projectExternalReferenceCode: string
	) {
		const response = await this.post<Response>(
			'/environments/activation-request',
			{environmentProfile, ...fields, projectExternalReferenceCode},
			{earlyReturn: true}
		);

		if (!response.ok) {
			throw this.toFetcherError(response);
		}
	}

	async postEnvironmentsOfflineActivationTokenValidation(token: string) {
		const response = await this.post<Response>(
			'/environments/offline-activation/token-validation',
			{token},
			{earlyReturn: true}
		);

		if (!response.ok) {
			throw this.toFetcherError(response);
		}
	}

	async postProjectsEnvironmentsActivationCodes(
		projectExternalReferenceCode: string,
		type: string
	) {
		const response = await this.post<Response>(
			`/projects/${projectExternalReferenceCode}/environments` +
				'/activation-codes',
			{type},
			{earlyReturn: true}
		);

		if (!response.ok) {
			throw this.toFetcherError(response);
		}

		return (await response.json()) as CloudGeneratedActivationCode;
	}

	private toFetcherError(response: Response) {
		const error = new FetcherError(
			'An error occurred while fetching the data.'
		);

		error.status = response.status;

		return error;
	}
}

const Cloud = new CloudOAuth2('/cloud');

export default Cloud;
