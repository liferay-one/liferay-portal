/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

export const SubscriptionUpgradeType = {
	AI_HUB_TIER: 'ai-hub-tier',
	CMP_ADD_ON: 'cmp-add-on',
} as const;

export type SubscriptionUpgradeType =
	(typeof SubscriptionUpgradeType)[keyof typeof SubscriptionUpgradeType];
