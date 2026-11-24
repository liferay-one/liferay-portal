/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {OneSpringBootOAuth2} from './OAuth2Client';

import type {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';
import type {
	SubscriptionUpgrade,
	SubscriptionUpgradeOrder,
	SubscriptionUpgradePricing,
} from '~/types/subscriptionUpgrade';

type SubscriptionUpgradesParameters = {
	accountId: number | string;
	projectExternalReferenceCode: string;
};

type SubscriptionUpgradeParameters = SubscriptionUpgradesParameters & {
	type: SubscriptionUpgradeType;
};

class SubscriptionUpgradesOAuth2 extends OneSpringBootOAuth2 {
	async getPricing({
		accountId,
		projectExternalReferenceCode,
		type,
	}: SubscriptionUpgradeParameters) {
		return this.get<SubscriptionUpgradePricing>(
			`/pricing?${new URLSearchParams({
				accountId: String(accountId),
				projectExternalReferenceCode,
				type,
			})}`
		);
	}

	async getSubscriptionUpgrades({
		accountId,
		projectExternalReferenceCode,
	}: SubscriptionUpgradesParameters) {
		return this.get<SubscriptionUpgrade[]>(
			`?${new URLSearchParams({
				accountId: String(accountId),
				projectExternalReferenceCode,
			})}`
		);
	}

	async postOrder(
		order: SubscriptionUpgradeParameters & {billingAddressId: number}
	) {
		return this.post<SubscriptionUpgradeOrder>('/orders', order);
	}
}

const SubscriptionUpgrades = new SubscriptionUpgradesOAuth2(
	'/subscription-upgrades'
);

export default SubscriptionUpgrades;
