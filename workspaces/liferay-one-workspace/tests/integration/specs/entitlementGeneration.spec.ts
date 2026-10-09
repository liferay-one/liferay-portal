/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect} from '@playwright/test';

import {apiTest as test} from '../fixtures/apiTest';
import {APIHelpers, HeadlessPage} from '../helpers/APIHelpers';

const commerceOrderItemId = Number(
	process.env.ONE_COMMERCE_ORDER_ITEM_ID ?? '0'
);

interface IEntitlement {
	externalReferenceCode: string;
	r_commerceOrderItemToEntitlement_commerceOrderItemId: number;
}

function entitlementsForItem(
	api: APIHelpers
): Promise<HeadlessPage<IEntitlement>> {
	return api.get<HeadlessPage<IEntitlement>>(
		`/o/c/entitlements?filter=${encodeURIComponent(
			`r_commerceOrderItemToEntitlement_commerceOrderItemId eq '${commerceOrderItemId}'`
		)}&pageSize=100`
	);
}

test.describe('[FLOW-ENTITLEMENT-GENERATION] commerce order item entitlement generation', () => {
	test('[FLOW-ENTITLEMENT-GENERATION] [REST-POST-ENTITLEMENTS-GENERATE] generates one entitlement per definition', async ({
		api,
	}) => {
		const response = await api.send(
			'post',
			api.springBoot(
				`/entitlements/generate?commerceOrderItemId=${commerceOrderItemId}`
			)
		);

		expect(response.status(), await response.text()).toBe(200);

		const {items, totalCount} = await entitlementsForItem(api);

		expect(totalCount).toBeGreaterThan(0);

		for (const entitlement of items) {
			expect(
				entitlement.r_commerceOrderItemToEntitlement_commerceOrderItemId
			).toBe(commerceOrderItemId);
		}
	});

	test('[FLOW-ENTITLEMENT-GENERATION] is idempotent across repeated generation', async ({
		api,
	}) => {
		await api.send(
			'post',
			api.springBoot(
				`/entitlements/generate?commerceOrderItemId=${commerceOrderItemId}`
			)
		);

		const first = await entitlementsForItem(api);

		await api.send(
			'post',
			api.springBoot(
				`/entitlements/generate?commerceOrderItemId=${commerceOrderItemId}`
			)
		);

		const second = await entitlementsForItem(api);

		expect(second.totalCount).toBe(first.totalCount);
	});

	test('[FLOW-ENTITLEMENT-GENERATION] [REST-POST-OBJECT-ACTION-COMMERCE-ORDER-ITEM-ENTITLEMENT-GENERATION] generates through the object action', async ({
		api,
	}) => {
		const response = await api.send(
			'post',
			api.springBoot(
				'/object/action/commerce/order/item/entitlement/generation'
			),
			{classPK: commerceOrderItemId}
		);

		expect(response.status(), await response.text()).toBe(200);

		const {totalCount} = await entitlementsForItem(api);

		expect(totalCount).toBeGreaterThan(0);
	});
});
