/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';

import SubscriptionUpgrades from './SubscriptionUpgrades';

const {oAuth2Fetch} = vi.hoisted(() => ({oAuth2Fetch: vi.fn()}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication: () => Promise.resolve({fetch: oAuth2Fetch}),
	getUserAgentApplication: vi.fn(),
}));

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), {status: 200});
}

describe('[CLIENT-SPRING-BOOT-SUBSCRIPTION-UPGRADES] SubscriptionUpgrades', () => {
	afterEach(() => {
		oAuth2Fetch.mockReset();
	});

	it('requests the subscription upgrades of an account project', async () => {
		const subscriptionUpgrades = [
			{
				contractEndDate: '2027-06-25',
				productExternalReferenceCode: 'PRDCT-DXP',
				targetProductId: 42,
				type: SubscriptionUpgradeType.CMP_ADD_ON,
			},
		];

		oAuth2Fetch.mockResolvedValue(jsonResponse(subscriptionUpgrades));

		await expect(
			SubscriptionUpgrades.getSubscriptionUpgrades({
				accountId: 7,
				projectExternalReferenceCode: 'PRJCT-1',
			})
		).resolves.toEqual(subscriptionUpgrades);

		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/subscription-upgrades?accountId=7&projectExternalReferenceCode=PRJCT-1',
			undefined
		);
	});

	it('requests the pricing of a subscription upgrade', async () => {
		oAuth2Fetch.mockResolvedValue(jsonResponse({total: 7500}));

		await expect(
			SubscriptionUpgrades.getPricing({
				accountId: 7,
				projectExternalReferenceCode: 'PRJCT-1',
				type: SubscriptionUpgradeType.CMP_ADD_ON,
			})
		).resolves.toEqual({total: 7500});

		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/subscription-upgrades/pricing?accountId=7&projectExternalReferenceCode=PRJCT-1&type=cmp-add-on',
			undefined
		);
	});

	it('posts the subscription upgrade order', async () => {
		oAuth2Fetch.mockResolvedValue(jsonResponse({orderId: 99}));

		const order = {
			accountId: 7,
			billingAddressId: 3,
			projectExternalReferenceCode: 'PRJCT-1',
			type: SubscriptionUpgradeType.CMP_ADD_ON,
		};

		await expect(SubscriptionUpgrades.postOrder(order)).resolves.toEqual({
			orderId: 99,
		});

		expect(oAuth2Fetch).toHaveBeenCalledWith(
			'/subscription-upgrades/orders',
			{body: JSON.stringify(order), method: 'POST'}
		);
	});
});
