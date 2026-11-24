/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';

import type {ProductPurchaseStep} from '~/pages/ProductPurchase/productPurchaseRoutes';

const subscriptionUpgradeSteps: Partial<
	Record<SubscriptionUpgradeType, () => ProductPurchaseStep[]>
> = {};

export function getSubscriptionUpgradeSteps(
	type: SubscriptionUpgradeType
): ProductPurchaseStep[] {
	return subscriptionUpgradeSteps[type]?.() ?? [];
}

export function isSubscriptionUpgradeType(
	value: string | null
): value is SubscriptionUpgradeType {
	return (Object.values(SubscriptionUpgradeType) as string[]).includes(
		value ?? ''
	);
}
