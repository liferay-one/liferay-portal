/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useDataQuery} from '~/hooks/useDataQuery';
import {useFetch} from '~/hooks/useFetch';
import {useActivationKeyScope} from '~/pages/MyAccount/Projects/LicenseKeys/hooks/useActivationKeyScope';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import ActivationKeys from '~/services/spring-boot/ActivationKeys';
import {getEnvironment} from '~/utils/orderItemOptionUtils';

import type {ProductOrderItem} from '~/hooks/useProjectOrders';
import type {Word} from '~/i18n';
import type {APIResponse} from '~/types/api';

export type EnvironmentEntitlement = {
	endDate: string;
	environment: string;
	provisionableCount?: number;
	provisionedCount?: number;
	quantity: number;
	skuProductName: string;
	startDate: string;
	terminationStatus: string;
};

type EntitlementNode = {
	endDate?: string;
	entitlementDefinitionToEntitlement?: {
		unit?: string;
	};
	generatesActivationKey?: boolean;
	id: number;
	licenseKeyType?: string;
	maxQuantity?: number;
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
	'entitlementDefinitionToEntitlement.unit',
	'generatesActivationKey',
	'id',
	'licenseKeyType',
	'maxQuantity',
	'quantity',
	'r_commerceOrderItemToEntitlement_commerceOrderItemId',
	'startDate',
	'terminationStatus',
].join(',');

function isEnvironmentEntitlement(
	entitlementNode: EntitlementNode,
	activationKeys: boolean
) {
	const {generatesActivationKey, licenseKeyType} = entitlementNode;
	const {unit} = entitlementNode.entitlementDefinitionToEntitlement ?? {};

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
	const scope = useActivationKeyScope();

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

	const {data: licenseKeyCounts, isLoading: licenseKeyCountsLoading} =
		useDataQuery({
			fetcher: () =>
				scope
					? ActivationKeys.getLicenseKeyCounts(scope)
					: Promise.reject(new Error('No activation key scope')),
			key:
				activationKeys && entitlementNodes.length && scope
					? `/activation-keys/license-key-counts?${new URLSearchParams(scope)}`
					: null,
		});

	const environmentEntitlements: EnvironmentEntitlement[] = useMemo(() => {
		const orderItemsById = new Map(
			orderItems.map((orderItem) => [orderItem.id, orderItem])
		);

		return entitlementNodes.map((entitlementNode) => {
			const orderItem = orderItemsById.get(
				entitlementNode.r_commerceOrderItemToEntitlement_commerceOrderItemId ??
					0
			);

			const licenseKeyCount = licenseKeyCounts?.[entitlementNode.id];

			const optionValueNames = orderItem?.optionValueNames ?? [];

			return {
				endDate: entitlementNode.endDate ?? '',
				environment:
					entitlementNode.licenseKeyType ||
					getEnvironment(optionValueNames),
				provisionableCount:
					licenseKeyCount?.totalCount ??
					Math.trunc(entitlementNode.maxQuantity ?? 0),
				provisionedCount: licenseKeyCounts
					? licenseKeyCount?.usedCount ?? 0
					: undefined,
				quantity: entitlementNode.quantity ?? 0,
				skuProductName: orderItem?.skuProductName ?? '',
				startDate: entitlementNode.startDate ?? '',
				terminationStatus: entitlementNode.terminationStatus ?? '',
			};
		});
	}, [entitlementNodes, licenseKeyCounts, orderItems]);

	return {
		environmentEntitlements,
		loading: entitlementsLoading || licenseKeyCountsLoading,
	};
}
