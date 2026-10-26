/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useDataQuery} from '~/hooks/useDataQuery';
import {useFetch} from '~/hooks/useFetch';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {queryGraphQL, toGraphQLString} from '~/services/graphql/GraphQL';
import {getEnvironment, getInstanceSize} from '~/utils/orderItemOptionUtils';

import type {ProductOrderItem} from '~/hooks/useProjectOrders';
import type {Word} from '~/i18n';
import type {APIResponse} from '~/types/api';

export type EnvironmentEntitlement = {
	endDate: string;
	environment: string;
	instanceSize: string;
	provisionedCount?: number;
	quantity: number;
	startDate: string;
	terminationStatus: string;
	tierName: string;
};

type EntitlementNode = {
	endDate?: string;
	entitlementDefinitionToEntitlement?: {
		generatesActivationKey?: boolean;
		licenseKeyType?: string;
		unit?: string;
	};
	id: number;
	quantity?: number;
	r_commerceOrderItemToEntitlement_commerceOrderItemId?: number;
	startDate?: string;
	terminationStatus?: string;
};

export const ENVIRONMENTS: Word[] = [
	'production',
	'non-production',
	'backup',
	'complimentary',
];

const ENTITLEMENT_FIELDS = [
	'endDate',
	'entitlementDefinitionToEntitlement.generatesActivationKey',
	'entitlementDefinitionToEntitlement.licenseKeyType',
	'entitlementDefinitionToEntitlement.unit',
	'id',
	'quantity',
	'r_commerceOrderItemToEntitlement_commerceOrderItemId',
	'startDate',
	'terminationStatus',
].join(',');

function countLicenseKeys(entitlementId: number) {
	return queryGraphQL<{licenseKeys: {totalCount: number}}>(
		`c { licenseKeys(filter: ${toGraphQLString(
			new SearchBuilder()
				.eq('active', true)
				.and()
				.eq('entitlementId', String(entitlementId))
				.build()
		)}, pageSize: 1) { totalCount } }`
	).then((data) => data.licenseKeys.totalCount);
}

function isEnvironmentEntitlement(
	entitlementNode: EntitlementNode,
	activationKeys: boolean
) {
	const {generatesActivationKey, licenseKeyType, unit} =
		entitlementNode.entitlementDefinitionToEntitlement ?? {};

	if (licenseKeyType && !ENVIRONMENTS.includes(licenseKeyType as Word)) {
		return false;
	}

	if (activationKeys) {
		return Boolean(generatesActivationKey);
	}

	return unit === 'boolean';
}

export function useProductEnvironmentEntitlements(
	orderItems: ProductOrderItem[],
	activationKeys: boolean
) {
	const orderItemIds = orderItems.map((orderItem) => orderItem.id);

	const {data: entitlementData, isLoading: entitlementsLoading} = useFetch<
		APIResponse<EntitlementNode>
	>(orderItemIds.length ? '/o/c/entitlements' : null, {
		params: {
			fields: ENTITLEMENT_FIELDS,
			filter: SearchBuilder.in(
				'r_commerceOrderItemToEntitlement_commerceOrderItemId',
				orderItemIds.map(String)
			),
			nestedFields: 'entitlementDefinitionToEntitlement',
			pageSize: -1,
		},
	});

	const entitlementNodes = useMemo(
		() =>
			(entitlementData?.items ?? []).filter((entitlementNode) =>
				isEnvironmentEntitlement(entitlementNode, activationKeys)
			),
		[activationKeys, entitlementData]
	);

	const entitlementIds = entitlementNodes.map(
		(entitlementNode) => entitlementNode.id
	);

	const {data: provisionedCounts, isLoading: provisionedCountsLoading} =
		useDataQuery({
			fetcher: () => Promise.all(entitlementIds.map(countLicenseKeys)),
			key:
				activationKeys && entitlementIds.length
					? `/license-key-counts/${entitlementIds.join(',')}`
					: null,
		});

	const environmentEntitlements: EnvironmentEntitlement[] = useMemo(() => {
		const orderItemsById = new Map(
			orderItems.map((orderItem) => [orderItem.id, orderItem])
		);

		return entitlementNodes.map((entitlementNode, index) => {
			const orderItem = orderItemsById.get(
				entitlementNode.r_commerceOrderItemToEntitlement_commerceOrderItemId ??
					0
			);

			const optionValueNames = orderItem?.optionValueNames ?? [];

			return {
				endDate: entitlementNode.endDate ?? '',
				environment:
					entitlementNode.entitlementDefinitionToEntitlement
						?.licenseKeyType || getEnvironment(optionValueNames),
				instanceSize: getInstanceSize(optionValueNames),
				provisionedCount: provisionedCounts?.[index],
				quantity: entitlementNode.quantity ?? 0,
				startDate: entitlementNode.startDate ?? '',
				terminationStatus: entitlementNode.terminationStatus ?? '',
				tierName: orderItem?.tierName ?? '',
			};
		});
	}, [entitlementNodes, orderItems, provisionedCounts]);

	return {
		environmentEntitlements,
		loading: entitlementsLoading || provisionedCountsLoading,
	};
}
