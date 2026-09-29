/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

export type GenerateActivationKeyServer = {
	hostName: string;
	ipAddresses: string;
	macAddresses: string;
};

export type GenerateActivationKeyServerField =
	| 'hostName'
	| 'ipAddresses'
	| 'macAddresses';

export type GenerateActivationKeyForm = {
	activationToken: string;
	bundleEntitlementIds: number[];
	dataCenterLocation: string;
	description: string;
	environmentName: string;
	keyType: string;
	notify: boolean;
	offlineSubscriptionIds: number[];
	productExternalReferenceCode: string;
	serverField: GenerateActivationKeyServerField;
	servers: GenerateActivationKeyServer[];
	subscriptionEntitlementId: number;
	version: string;
	workspaceName: string;
	workspaceOwnerEmail: string;
};

export type GenerateActivationKeyStep =
	| 'activation-codes'
	| 'add-ons'
	| 'dsr'
	| 'environment'
	| 'non-production-environments'
	| 'offline-package'
	| 'offline-token'
	| 'subscription';
