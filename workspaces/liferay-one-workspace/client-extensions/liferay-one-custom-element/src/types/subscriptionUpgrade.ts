/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';

export type SubscriptionUpgrade = {
	contractEndDate: string;
	currentTier?: string;
	productExternalReferenceCode: string;
	targetProductId: number;
	targetSkuExternalReferenceCode?: string;
	targetTier?: string;
	type: SubscriptionUpgradeType;
};

export type SubscriptionUpgradeLineItem = {
	name: string;
	quantity: number;
	total: number;
	unitPrice: number;
};

export type SubscriptionUpgradeOrder = {
	orderId: number;
};

export type SubscriptionUpgradePricing = {
	contractEndDate: string;
	currencyCode: string;
	lineItems: SubscriptionUpgradeLineItem[];
	remainingMonths: number;
	termMonths: number;
	total: number;
};
