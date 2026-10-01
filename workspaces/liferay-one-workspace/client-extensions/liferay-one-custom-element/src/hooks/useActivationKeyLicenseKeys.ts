/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useFetch} from '~/hooks/useFetch';
import SearchBuilder from '~/utils/SearchBuilder';
import escapeODataString from '~/utils/escapeODataString';

import type {APIResponse} from '~/types/api';

export const LICENSE_KEY_PAGE_SIZE = 200;

export type ActivationKeyLicenseKey = {
	activationKeyId: number;
	active: boolean;
	clusterSize: string;
	complimentary: boolean;
	dataCenterLocation: string;
	description: string;
	domains: string;
	entitlementId: number;
	expirationDate: string;
	externalReferenceCode: string;
	hostName: string;
	ipAddresses: string;
	licenseKeyId: string;
	licenseName: string;
	licenseType: string;
	macAddresses: string;
	name: string;
	orderId: string;
	owner: string;
	productExternalReferenceCode: string;
	productName: string;
	productVersion: string;
	sizing: string;
	startDate: string;
	workspaceName: string;
	workspaceOwnerEmail: string;
};

export type LicenseKeyNode = {
	active: boolean;
	complimentary?: boolean;
	customExpirationDate?: string;
	dataCenterLocation?: string;
	dateCreated?: string;
	description?: string;
	domains?: string;
	entitlementId?: number;
	externalReferenceCode?: string;
	hostName?: string;
	id?: number;
	ipAddresses?: string;
	licenseName?: string;
	licenseType?: string;
	macAddresses?: string;
	maxClusterNodes?: number;
	maxServers?: number;
	name?: string;
	orderId?: string;
	owner?: string;
	productName?: string;
	productVersion?: string;
	r_activationKeyToLicenseKey_c_activationKeyId?: number;
	r_commerceProductToLicenseKey_CProductERC?: string;
	sizing?: string;
	startDate?: string;
	workspaceName?: string;
	workspaceOwnerEmail?: string;
};

function getClusterSize(node: LicenseKeyNode): string {
	const nodes = node.maxClusterNodes ?? node.maxServers;

	return nodes ? String(nodes) : '';
}

export function toActivationKeyLicenseKey(
	node: LicenseKeyNode
): ActivationKeyLicenseKey {
	return {
		activationKeyId:
			node.r_activationKeyToLicenseKey_c_activationKeyId ?? 0,
		active: node.active,
		clusterSize: getClusterSize(node),
		complimentary: node.complimentary ?? false,
		dataCenterLocation: node.dataCenterLocation ?? '',
		description: node.description ?? '',
		domains: node.domains ?? '',
		entitlementId: node.entitlementId ?? 0,
		expirationDate: node.customExpirationDate ?? '',
		externalReferenceCode: node.externalReferenceCode ?? '',
		hostName: node.hostName ?? '',
		ipAddresses: node.ipAddresses ?? '',
		licenseKeyId: node.id ? String(node.id) : '',
		licenseName: node.licenseName ?? '',
		licenseType: node.licenseType ?? '',
		macAddresses: node.macAddresses ?? '',
		name: node.name ?? '',
		orderId: node.orderId ?? '',
		owner: node.owner ?? '',
		productExternalReferenceCode:
			node.r_commerceProductToLicenseKey_CProductERC ?? '',
		productName: node.productName ?? '',
		productVersion: node.productVersion ?? '',
		sizing: node.sizing ?? '',
		startDate: node.startDate ?? '',
		workspaceName: node.workspaceName ?? '',
		workspaceOwnerEmail: node.workspaceOwnerEmail ?? '',
	};
}

export function useUnaggregatedLicenseKey(externalReferenceCode?: string) {
	const {
		data,
		error,
		isLoading: loading,
	} = useFetch<LicenseKeyNode>(
		externalReferenceCode
			? `/o/c/licensekeys/by-external-reference-code/${externalReferenceCode}`
			: null
	);

	return {
		error,
		licenseKey: data ? toActivationKeyLicenseKey(data) : undefined,
		loading,
	};
}

export function useActivationKeyLicenseKeys(activationKeyId?: string) {
	const {
		data,
		error,
		isLoading: loading,
		revalidate,
	} = useFetch<APIResponse<LicenseKeyNode>>(
		activationKeyId ? '/o/c/licensekeys' : null,
		{
			params: {
				filter: SearchBuilder.eq(
					'r_activationKeyToLicenseKey_c_activationKeyId',
					escapeODataString(activationKeyId ?? '')
				),
				pageSize: LICENSE_KEY_PAGE_SIZE,
			},
		}
	);

	const licenseKeys: ActivationKeyLicenseKey[] = (data?.items ?? []).map(
		toActivationKeyLicenseKey
	);

	return {error, licenseKeys, loading, revalidate};
}
