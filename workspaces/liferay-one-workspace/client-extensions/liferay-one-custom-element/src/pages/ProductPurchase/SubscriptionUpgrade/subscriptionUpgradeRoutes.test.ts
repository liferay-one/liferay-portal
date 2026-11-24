/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';

import {
	getSubscriptionUpgradeSteps,
	isSubscriptionUpgradeType,
} from './subscriptionUpgradeRoutes';

describe('subscriptionUpgradeRoutes', () => {
	it('gives the CMP add-on a single summary step', () => {
		const steps = getSubscriptionUpgradeSteps(
			SubscriptionUpgradeType.CMP_ADD_ON
		);

		expect(steps).toHaveLength(1);
		expect(steps[0].index).toBe(true);
	});

	it('gives no steps to an upgrade type without a registered flow', () => {
		expect(
			getSubscriptionUpgradeSteps(SubscriptionUpgradeType.AI_HUB_TIER)
		).toEqual([]);
	});

	it('accepts only known subscription upgrade types', () => {
		expect(isSubscriptionUpgradeType('cmp-add-on')).toBe(true);
		expect(isSubscriptionUpgradeType('ai-hub-tier')).toBe(true);
		expect(isSubscriptionUpgradeType('unknown')).toBe(false);
		expect(isSubscriptionUpgradeType(null)).toBe(false);
	});
});
