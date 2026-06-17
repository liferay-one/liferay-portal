/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {OrderTypes} from '../../../enums/Order';
import {getSpecificationValues} from '../../../hooks/data/useProjectCommerce';
import {Word} from '../../../i18n';

export type ProjectTabKey =
	| 'details'
	| 'activation'
	| 'download'
	| 'utilization'
	| 'environment'
	| 'orders'
	| 'help-and-support';

export type ProjectItemKind = 'application' | 'product';

// Canonical tab order. The "Invoices" tab from the legacy layout is dropped
// (no longer part of MVP), so it is intentionally absent here.

export const PROJECT_TAB_ORDER: ProjectTabKey[] = [
	'details',
	'activation',
	'download',
	'utilization',
	'environment',
	'orders',
	'help-and-support',
];

// Which tabs are shown for each product/app type. Source of truth: the "My
// Projects-Products and Apps D" sheet of the MASTER Liferay Unified Portal
// spreadsheet. Each entry lists the tabs that are visible for that type; every
// other tab is hidden. The key is the order's orderTypeExternalReferenceCode
// (see OrderTypes), which is the runtime signal for a purchased item's type.
//
// Spreadsheet product rows without a corresponding OrderType today (Enterprise
// Search, Commerce, Analytics Cloud, PaaS, Cloud Native, LDP, self-managed
// DXP/Portal) are not reachable at runtime and fall back to FALLBACK_TABS until
// their order types exist.

export const TAB_VISIBILITY: Partial<Record<OrderTypes, ProjectTabKey[]>> = {

	// Products

	[OrderTypes.ADDONS]: ['details', 'orders'],
	[OrderTypes.AI_HUB]: ['details', 'activation', 'orders'],
	[OrderTypes.CMP]: ['details', 'activation', 'download', 'orders'],
	[OrderTypes.DSR]: [
		'details',
		'activation',
		'download',
		'environment',
		'orders',
	],
	[OrderTypes.DXP]: ['details', 'activation', 'download', 'orders'],
	[OrderTypes.SSA_SAAS]: [
		'details',
		'activation',
		'utilization',
		'environment',
		'orders',
	],

	// Applications (always include Help & Support)

	[OrderTypes.CLIENT_EXTENSION]: [
		'details',
		'activation',
		'orders',
		'help-and-support',
	],
	[OrderTypes.CLOUD_APP]: [
		'details',
		'environment',
		'orders',
		'help-and-support',
	],
	[OrderTypes.COMPOSITE_APP]: [
		'details',
		'activation',
		'download',
		'orders',
		'help-and-support',
	],
	[OrderTypes.DXP_APP]: [
		'details',
		'activation',
		'download',
		'orders',
		'help-and-support',
	],
	[OrderTypes.LOW_CODE_CONFIGURATION]: [
		'details',
		'download',
		'orders',
		'help-and-support',
	],
	[OrderTypes.OTHER]: ['details', 'orders', 'help-and-support'],

	// Solutions (not detailed in the products/apps sheet; minimal set)

	[OrderTypes.SOLUTIONS7]: ['details', 'orders'],
	[OrderTypes.SOLUTIONS30]: ['details', 'orders'],
};

// Shown when a purchased item's type cannot be resolved to a row above.

const FALLBACK_TABS: Record<ProjectItemKind, ProjectTabKey[]> = {
	application: [
		'details',
		'activation',
		'download',
		'orders',
		'help-and-support',
	],
	product: ['details', 'activation', 'orders'],
};

// A purchased item with no placed order yet still has a delivery-catalog
// product, so products fall back to a type derived from their Liferay product
// category. Applications resolve their type from the order alone.

const ORDER_TYPE_BY_PRODUCT_CATEGORY: {[category: string]: OrderTypes} = {
	'Artificial Intelligence': OrderTypes.AI_HUB,
	'Customer Data': OrderTypes.CMP,
	'Platform': OrderTypes.DXP,
};

export const PROJECT_TAB_LABELS: Record<ProjectTabKey, Word> = {
	'activation': 'activation',
	'details': 'details',
	'download': 'download',
	'environment': 'environment',
	'help-and-support': 'help-and-support',
	'orders': 'orders',
	'utilization': 'utilization',
};

function resolveOrderType(
	orderType: string | undefined,
	product?: DeliveryProduct
): OrderTypes | undefined {
	if (orderType && orderType in TAB_VISIBILITY) {
		return orderType as OrderTypes;
	}

	if (product) {
		const categories = getSpecificationValues(
			product,
			'liferay-products-categories'
		);

		for (const category of categories) {
			if (ORDER_TYPE_BY_PRODUCT_CATEGORY[category]) {
				return ORDER_TYPE_BY_PRODUCT_CATEGORY[category];
			}
		}
	}

	return undefined;
}

// Returns the tabs that should be shown for a purchased item, in canonical
// order. The type is resolved from the item's order type when available,
// falling back to its product category and finally to a kind-based default.

export function getVisibleProjectTabKeys({
	kind,
	orderType,
	product,
}: {
	kind: ProjectItemKind;
	orderType?: string;
	product?: DeliveryProduct;
}): ProjectTabKey[] {
	const resolvedOrderType = resolveOrderType(orderType, product);

	const allowedTabs =
		(resolvedOrderType && TAB_VISIBILITY[resolvedOrderType]) ??
		FALLBACK_TABS[kind];

	return PROJECT_TAB_ORDER.filter((tabKey) => allowedTabs.includes(tabKey));
}
