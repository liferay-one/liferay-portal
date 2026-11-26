/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';

import isAIHubStudioUpgrade from './isAIHubStudioUpgrade';

import type {SubscriptionUpgrade} from '~/types/subscriptionUpgrade';

const aiHubTierUpgrade: SubscriptionUpgrade = {
	contractEndDate: '2027-06-10',
	currentTier: 'activate',
	productExternalReferenceCode: 'AI-HUB',
	targetProductId: 4321,
	targetTier: 'studio',
	type: SubscriptionUpgradeType.AI_HUB_TIER,
};

describe('isAIHubStudioUpgrade', () => {
	it('accepts an AI Hub upgrade from Activate to Studio', () => {
		expect(isAIHubStudioUpgrade(aiHubTierUpgrade)).toBe(true);
	});

	it('accepts the tiers in any case', () => {
		expect(
			isAIHubStudioUpgrade({
				...aiHubTierUpgrade,
				currentTier: 'Activate',
				targetTier: 'STUDIO',
			})
		).toBe(true);
	});

	it('accepts an AI Hub upgrade without tiers', () => {
		expect(
			isAIHubStudioUpgrade({
				...aiHubTierUpgrade,
				currentTier: undefined,
				targetTier: undefined,
			})
		).toBe(true);
	});

	it('rejects an AI Hub upgrade to another tier', () => {
		expect(
			isAIHubStudioUpgrade({...aiHubTierUpgrade, targetTier: 'pro'})
		).toBe(false);
	});

	it('rejects an AI Hub upgrade from another tier', () => {
		expect(
			isAIHubStudioUpgrade({...aiHubTierUpgrade, currentTier: 'pro'})
		).toBe(false);
	});

	it('rejects an upgrade of another type', () => {
		expect(
			isAIHubStudioUpgrade({
				...aiHubTierUpgrade,
				type: SubscriptionUpgradeType.CMP_ADD_ON,
			})
		).toBe(false);
	});
});
