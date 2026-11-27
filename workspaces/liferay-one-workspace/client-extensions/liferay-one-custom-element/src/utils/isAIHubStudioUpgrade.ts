/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';

import type {SubscriptionUpgrade} from '~/types/subscriptionUpgrade';

function isTier(tier: string | undefined, expectedTier: string) {
	return !tier || tier.toLowerCase() === expectedTier;
}

export function isAIHubStudioUpgrade(subscriptionUpgrade: SubscriptionUpgrade) {
	return (
		subscriptionUpgrade.type === SubscriptionUpgradeType.AI_HUB_TIER &&
		isTier(subscriptionUpgrade.currentTier, 'activate') &&
		isTier(subscriptionUpgrade.targetTier, 'studio')
	);
}

export default isAIHubStudioUpgrade;
