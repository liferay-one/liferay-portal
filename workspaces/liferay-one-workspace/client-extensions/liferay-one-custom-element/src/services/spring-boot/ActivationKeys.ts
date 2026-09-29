/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {downloadFile} from '~/utils/downloadFileUtils';

import {OneSpringBootOAuth2} from './OAuth2Client';

export type GenerateFormBundleProduct = {
	availableCount: number;
	entitlementId: number;
	externalReferenceCode: string;
	licensable: boolean;
	licenseEntryFamily: string;
	name: string;
};

export type GenerateFormKeyType = {
	entitlementId: number;
	key: string;
	licenseEntryType: string;
	productKey: string;
	subscriptions: GenerateFormSubscription[];
};

export type GenerateFormSubscription = {
	availableCount: number;
	endDate?: string;
	entitlementId: number;
	instanceSize: number;
	startDate?: string;
	totalCount: number;
};

export type GenerateFormProduct = {
	developerVersions: string[];
	entitlementId: number;
	externalReferenceCode: string;
	keyTypes: GenerateFormKeyType[];
	label: string;
	name: string;
	versions: string[];
};

export type GenerateForm = {
	bundleProducts: GenerateFormBundleProduct[];
	products: GenerateFormProduct[];
};

export type GenerateServer = {
	hostName: string;
	ipAddresses: string;
	macAddresses: string;
};

export type GenerateActivationKeyRequest = {
	bundleEntitlementIds: number[];
	dataCenterLocation?: string;
	description?: string;
	environmentName: string;
	keyType: string;
	projectExternalReferenceCode: string;
	servers: GenerateServer[];
	subscriptionEntitlementId: number;
	version: string;
	workspaceName?: string;
	workspaceOwnerEmail?: string;
};

export type GeneratedActivationKey = {
	activationKeyId: number;
	externalReferenceCode: string;
};

class ActivationKeysOAuth2 extends OneSpringBootOAuth2 {
	async deactivateActivationKey(activationKeyId: string): Promise<void> {
		await this.patch(`/${activationKeyId}/active`, {active: false});
	}

	async downloadActivationKey(activationKeyId: string, name: string) {
		const response = await this.get<Response>(
			`/${activationKeyId}/download`,
			{earlyReturn: true}
		);

		await downloadFile(name, response);
	}

	generateActivationKey(
		body: GenerateActivationKeyRequest
	): Promise<GeneratedActivationKey> {
		return this.post('/generate', body);
	}

	getGenerateForm(
		projectExternalReferenceCode: string,
		renewedActivationKeyExternalReferenceCode?: string
	): Promise<GenerateForm> {
		const searchParams = new URLSearchParams({
			projectExternalReferenceCode,
		});

		if (renewedActivationKeyExternalReferenceCode) {
			searchParams.set(
				'renewedActivationKeyExternalReferenceCode',
				renewedActivationKeyExternalReferenceCode
			);
		}

		return this.get<GenerateForm>(`/generate-form?${searchParams}`);
	}

	async getSubscription(activationKeyId: string): Promise<boolean> {
		const {subscribed} = await this.get<{subscribed: boolean}>(
			`/subscriptions?activationKeyId=${activationKeyId}`
		);

		return subscribed ?? false;
	}

	async reactivateActivationKey(activationKeyId: string): Promise<void> {
		await this.patch(`/${activationKeyId}/active`, {active: true});
	}

	async subscribe(activationKeyId: string): Promise<void> {
		await this.put(`/subscriptions?activationKeyIds=${activationKeyId}`);
	}

	async unsubscribe(activationKeyId: string): Promise<void> {
		await this.delete(`/subscriptions?activationKeyIds=${activationKeyId}`);
	}
}

const ActivationKeys = new ActivationKeysOAuth2('/activation-keys');

export default ActivationKeys;
