/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	endsBeforeStart,
	getIds,
	getLoadedIds,
	getOrderItems,
	getOutsideReferenceIds,
	isComplete,
	toFinding,
	toNumber,
} from './accountFindingUtils';

import type {
	AccountFinding,
	AccountInspection,
} from '~/types/accountInspection';

const ORDER_STATUS_COMPLETED = 0;

export function getOrderChecks({
	orders,
	related,
}: AccountInspection): AccountFinding[] {
	const contractIds = getLoadedIds(related.contracts);

	const projectNames = isComplete(related.projects)
		? new Set(
				related.projects.items
					.filter(({name}) => name)
					.map(({name}) => String(name))
			)
		: null;

	const entitledOrderItemIds = new Set(
		related.entitlements.items.map((entitlement) =>
			toNumber(
				entitlement.r_commerceOrderItemToEntitlement_commerceOrderItemId
			)
		)
	);

	const completedOrders = orders.items.filter(
		({orderStatus}) => orderStatus === ORDER_STATUS_COMPLETED
	);

	return [
		...toFinding(
			'orders',
			projectNames
				? getIds(orders.items, ({customFields}) => {
						const projectName = customFields?.projectName;

						return (
							Boolean(projectName) &&
							!projectNames.has(String(projectName))
						);
					})
				: [],
			'orders-name-a-project-that-the-account-does-not-have',
			'danger'
		),
		...toFinding(
			'orders',
			contractIds
				? getIds(orders.items, ({customFields}) => {
						const contractId = toNumber(customFields?.contractId);

						return contractId !== 0 && !contractIds.has(contractId);
					})
				: [],
			'orders-reference-contracts-outside-the-account',
			'danger'
		),
		...toFinding(
			'orders',
			!isComplete(related.entitlements)
				? []
				: getIds(completedOrders, ({orderItems}) =>
						(orderItems ?? []).some(
							({id}) => !entitledOrderItemIds.has(id)
						)
					),
			'completed-orders-have-items-with-no-entitlements',
			'info'
		),
	];
}

export function getEntitlementChecks({
	orders,
	related: {entitlements, licenseKeys},
}: AccountInspection): AccountFinding[] {
	const entitlementIds = getLoadedIds(entitlements);

	const orderIds = isComplete(orders)
		? new Set(orders.items.map(({id}) => id))
		: null;

	const orderItemIds = isComplete(orders)
		? new Set(getOrderItems(orders.items).map(({id}) => id))
		: null;

	return [
		...toFinding(
			'entitlements',
			getIds(
				entitlements.items,
				(entitlement) =>
					!toNumber(
						entitlement.r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId
					)
			),
			'entitlements-have-no-entitlement-definition',
			'warning'
		),
		...toFinding(
			'entitlements',
			getIds(
				entitlements.items,
				(entitlement) =>
					!toNumber(
						entitlement.r_commerceOrderItemToEntitlement_commerceOrderItemId
					)
			),
			'entitlements-have-no-order-item',
			'warning'
		),
		...toFinding(
			'entitlements',
			getOutsideReferenceIds(
				entitlements.items,
				'r_commerceOrderItemToEntitlement_commerceOrderItemId',
				orderItemIds
			),
			'entitlements-reference-order-items-outside-the-account',
			'danger'
		),
		...toFinding(
			'entitlements',
			getIds(entitlements.items, endsBeforeStart),
			'entitlements-end-before-they-start',
			'warning'
		),
		...toFinding(
			'licenseKeys',
			getOutsideReferenceIds(
				licenseKeys.items,
				'entitlementId',
				entitlementIds
			),
			'license-keys-reference-entitlements-outside-the-account',
			'warning'
		),
		...toFinding(
			'licenseKeys',
			getOutsideReferenceIds(licenseKeys.items, 'orderId', orderIds),
			'license-keys-reference-orders-outside-the-account',
			'warning'
		),
	];
}
