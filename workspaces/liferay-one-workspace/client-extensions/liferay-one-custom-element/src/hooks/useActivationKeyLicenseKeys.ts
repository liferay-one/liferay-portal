/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useFetch} from '~/hooks/useFetch';
import SearchBuilder from '~/utils/SearchBuilder';
import escapeODataString from '~/utils/escapeODataString';

import type {APIResponse} from '~/types/api';

export type ActivationKeyLicenseKey = {
	active: boolean;
	clusterSize: string;
	entitlementId: number;
	hostName: string;
	ipAddresses: string;
	licenseKeyId: string;
	licenseName: string;
	macAddresses: string;
	productExternalReferenceCode: string;
	productName: string;
	sizing: string;
};

type LicenseKeyNode = {
	active: boolean;
	entitlementId?: number;
	hostName?: string;
	id?: number;
	ipAddresses?: string;
	licenseName?: string;
	macAddresses?: string;
	maxClusterNodes?: number;
	maxServers?: number;
	productName?: string;
	r_commerceProductToLicenseKey_CProductERC?: string;
	sizing?: string;
};

function getClusterSize(node: LicenseKeyNode): string {
	const nodes = node.maxClusterNodes ?? node.maxServers;

	return nodes ? String(nodes) : '';
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
				pageSize: 200,
			},
		}
	);

	const licenseKeys: ActivationKeyLicenseKey[] = (data?.items ?? []).map(
		(node) => ({
			active: node.active,
			clusterSize: getClusterSize(node),
			entitlementId: node.entitlementId ?? 0,
			hostName: node.hostName ?? '',
			ipAddresses: node.ipAddresses ?? '',
			licenseKeyId: node.id ? String(node.id) : '',
			licenseName: node.licenseName ?? '',
			macAddresses: node.macAddresses ?? '',
			productExternalReferenceCode:
				node.r_commerceProductToLicenseKey_CProductERC ?? '',
			productName: node.productName ?? '',
			sizing: node.sizing ?? '',
		})
	);

	return {error, licenseKeys, loading, revalidate};
}
