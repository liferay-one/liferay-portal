/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {downloadFile} from '~/utils/downloadFileUtils';

import {OneSpringBootOAuth2} from './OAuth2Client';

export type LicenseKey = {
	active: boolean;
	customExpirationDate: string;
	domains: string;
	id: number;
	name: string;
	orderId: string;
	owner: string;
	productName: string;
	startDate: string;
};

export type GenerateFormBundleProduct = {
	availableCount: number;
	entitlementId: number;
	externalReferenceCode: string;
	licensable: boolean;
	name: string;
};

export type GenerateFormKeyType = {
	label: string;
	licenseEntryType: string;
	productKey: string;
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
	name: string;
	subscriptions: GenerateFormSubscription[];
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

export type GenerateLicenseKeysRequest = {
	bundleEntitlementIds: number[];
	dataCenterLocation?: string;
	description?: string;
	environmentName: string;
	keyType: string;
	projectExternalReferenceCode: string;
	renewedLicenseKeyIds?: number[];
	servers: GenerateServer[];
	subscriptionEntitlementId: number;
	version: string;
	workspaceName?: string;
	workspaceOwnerEmail?: string;
};

class LicenseKeysOAuth2 extends OneSpringBootOAuth2 {
	createLicenseKeyTypeFree({
		domains,
		orderId,
		owner,
	}: {
		domains: string;
		orderId: string;
		owner: string;
	}): Promise<LicenseKey> {
		return this.post('/type-free', {domains, orderId, owner});
	}

	async deactivateLicenseKey(licenseKeyId: string): Promise<void> {
		await this.patch(`/${licenseKeyId}/active`, {active: false});
	}

	async downloadDeveloperKey({
		name,
		productName,
		projectExternalReferenceCode,
		version,
	}: {
		name: string;
		productName: string;
		projectExternalReferenceCode: string;
		version: string;
	}) {
		const searchParams = new URLSearchParams({
			productName,
			projectExternalReferenceCode,
			version,
		});

		const response = await this.get<Response>(
			`/developer-download?${searchParams}`,
			{earlyReturn: true}
		);

		await downloadFile(name, response);
	}

	async downloadLicenseKey(licenseKeyId: string, name: string) {
		const response = await this.get<Response>(`/${licenseKeyId}/download`, {
			earlyReturn: true,
		});

		await downloadFile(name, response);
	}

	async downloadLicenseKeys(licenseKeyIds: number[], name: string) {
		const searchParams = new URLSearchParams({
			licenseKeyIds: licenseKeyIds.join(','),
		});

		const response = await this.get<Response>(`/download?${searchParams}`, {
			earlyReturn: true,
		});

		await downloadFile(name, response);
	}

	generateLicenseKeys(
		body: GenerateLicenseKeysRequest
	): Promise<{licenseKeyIds: number[]}> {
		return this.post('/generate', body);
	}

	getGenerateForm(
		projectExternalReferenceCode: string
	): Promise<GenerateForm> {
		const searchParams = new URLSearchParams({
			projectExternalReferenceCode,
		});

		return this.get<GenerateForm>(`/generate-form?${searchParams}`);
	}

	getSubscription(licenseKeyId: string): Promise<boolean> {
		return this.get<boolean>(`/subscriptions?licenseKeyId=${licenseKeyId}`);
	}

	async licenseKeyTypeFreeDomainsCheck({
		domains,
		owner,
	}: {
		domains: string;
		owner: string;
	}) {
		await this.post('/type-free-domains-check', {domains, owner});
	}

	async reactivateLicenseKey(licenseKeyId: string): Promise<void> {
		await this.patch(`/${licenseKeyId}/active`, {active: true});
	}

	async subscribe(licenseKeyId: string): Promise<void> {
		await this.put(`/subscriptions?licenseKeyIds=${licenseKeyId}`);
	}

	async unsubscribe(licenseKeyId: string): Promise<void> {
		await this.delete(`/subscriptions?licenseKeyIds=${licenseKeyId}`);
	}
}

const LicenseKeys = new LicenseKeysOAuth2('/license-keys');

export default LicenseKeys;
