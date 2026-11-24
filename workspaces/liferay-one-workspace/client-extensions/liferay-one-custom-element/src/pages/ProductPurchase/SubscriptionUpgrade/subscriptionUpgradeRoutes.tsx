/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {lazy} from 'react';
import {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';
import i18n from '~/i18n';

import type {ProductPurchaseStep} from '~/pages/ProductPurchase/productPurchaseRoutes';

const CMPAddOnSummary = lazy(() => import('./CMPAddOnSummary/CMPAddOnSummary'));

const subscriptionUpgradeSteps: Partial<
	Record<SubscriptionUpgradeType, () => ProductPurchaseStep[]>
> = {
	[SubscriptionUpgradeType.CMP_ADD_ON]: () => [
		{
			element: <CMPAddOnSummary />,
			index: true,
			title: i18n.translate('summary'),
		},
	],
};

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
