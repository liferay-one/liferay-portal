/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useDataQuery} from '~/hooks/useDataQuery';
import {useFetch} from '~/hooks/useFetch';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {queryGraphQL, toGraphQLString} from '~/services/graphql/GraphQL';

import type {APIResponse} from '~/types/api';

export type EnvironmentEntitlement = {
	endDate: string;
	environment: string;
	provisionedCount: number;
	quantity: number;
	startDate: string;
};

type EntitlementNode = {
	endDate?: string;
	entitlementDefinitionToEntitlement?: {
		licenseKeyType?: string;
	};
	id: number;
	quantity?: number;
	startDate?: string;
};

function countLicenseKeys(entitlementId: number) {
	return queryGraphQL<{licenseKeys: {totalCount: number}}>(
		`c { licenseKeys(filter: ${toGraphQLString(
			new SearchBuilder()
				.eq('active', true)
				.and()
				.eq(
					'r_entitlementToLicenseKey_c_entitlementId',
					String(entitlementId)
				)
				.build()
		)}, pageSize: 1) { totalCount } }`
	).then((data) => data.licenseKeys.totalCount);
}

export function useProductEnvironmentEntitlements(
	orderItemIds: number[],
	countsProvisionedKeys: boolean
) {
	const {data: entitlementData, isLoading: entitlementsLoading} = useFetch<
		APIResponse<EntitlementNode>
	>(orderItemIds.length ? '/o/c/entitlements' : null, {
		params: {
			fields: 'endDate,entitlementDefinitionToEntitlement.licenseKeyType,id,quantity,startDate',
			filter: SearchBuilder.in(
				'r_commerceOrderItemToEntitlement_commerceOrderItemId',
				orderItemIds.map(String)
			),
			nestedFields: 'entitlementDefinitionToEntitlement',
			pageSize: -1,
		},
	});

	const entitlementNodes = useMemo(
		() => entitlementData?.items ?? [],
		[entitlementData]
	);

	const entitlementIds = entitlementNodes.map(
		(entitlementNode) => entitlementNode.id
	);

	const {data: provisionedCounts, isLoading: provisionedCountsLoading} =
		useDataQuery({
			fetcher: () => Promise.all(entitlementIds.map(countLicenseKeys)),
			key:
				countsProvisionedKeys && entitlementIds.length
					? `/license-key-counts/${entitlementIds.join(',')}`
					: null,
		});

	const environmentEntitlements: EnvironmentEntitlement[] = useMemo(
		() =>
			entitlementNodes.map((entitlementNode, index) => ({
				endDate: entitlementNode.endDate ?? '',
				environment:
					entitlementNode.entitlementDefinitionToEntitlement
						?.licenseKeyType ?? '',
				provisionedCount: provisionedCounts?.[index] ?? 0,
				quantity: entitlementNode.quantity ?? 0,
				startDate: entitlementNode.startDate ?? '',
			})),
		[entitlementNodes, provisionedCounts]
	);

	return {
		environmentEntitlements,
		loading: entitlementsLoading || provisionedCountsLoading,
	};
}
