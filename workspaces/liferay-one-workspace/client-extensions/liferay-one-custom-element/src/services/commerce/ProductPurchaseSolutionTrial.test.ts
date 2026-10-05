/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Liferay} from '~/services/liferay/liferay';
import Trial from '~/services/spring-boot/Trial';

import ProductPurchaseSolutionTrial from './ProductPurchaseSolutionTrial';

import type {Account} from '~/types/accounts';
import type {Cart} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

vi.mock('~/services/headless/CommerceUI', () => ({
	default: {selectAccount: vi.fn()},
}));

vi.mock('~/services/headless/HeadlessCommerceDeliveryCart', () => ({
	default: {
		checkoutCart: vi.fn(),
		createCart: vi.fn(),
		getPaymentMethodURL: vi.fn(),
		updateCart: vi.fn(),
	},
}));

vi.mock('~/services/liferay/Analytics', () => ({
	Analytics: {track: vi.fn()},
}));

vi.mock('~/services/spring-boot/Trial', () => ({
	default: {getAvailability: vi.fn(), provisioningTrial: vi.fn()},
}));

const account = {id: 1} as Account;

const product = {
	id: 10,
	name: 'Solution',
	productId: 20,
	skus: [{id: 30}],
} as DeliveryProduct;

function mockAvailability(available: number, fallback: boolean) {
	vi.mocked(Trial.getAvailability).mockResolvedValue({
		active: true,
		available,
		fallback,
		max: 5,
	});
}

describe('[CLIENT-COMMERCE-PRODUCTPURCHASESOLUTIONTRIAL] ProductPurchaseSolutionTrial', () => {
	const commerceContext = {...Liferay.CommerceContext};

	beforeEach(() => {
		Object.assign(Liferay.CommerceContext, {
			commerceChannelId: '99',
			currency: {currencyCode: 'USD'},
		});

		vi.mocked(HeadlessCommerceDeliveryCart.createCart).mockResolvedValue({
			id: 5,
		} as Cart);
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};

		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('carries state hold when availability reports zero available trials', async () => {
		mockAvailability(0, false);

		await expect(
			new ProductPurchaseSolutionTrial(account, product).getNextStepsLink(
				{id: 5} as Cart
			)
		).resolves.toBe('/next-steps?orderId=5&state=hold');
	});

	it('creates the order, then fires trial provisioning', async () => {
		vi.mocked(Trial.provisioningTrial).mockReturnValue(
			new Promise(() => {})
		);

		await expect(
			new ProductPurchaseSolutionTrial(account, product).createOrder()
		).resolves.toEqual({id: 5});

		expect(
			vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock.calls[0][1]
		).toMatchObject({orderTypeExternalReferenceCode: 'SOLUTIONS7'});
		expect(Trial.provisioningTrial).toHaveBeenCalledWith(5);

		const [checkoutOrder] = vi.mocked(
			HeadlessCommerceDeliveryCart.checkoutCart
		).mock.invocationCallOrder;
		const [provisioningOrder] = vi.mocked(Trial.provisioningTrial).mock
			.invocationCallOrder;

		expect(checkoutOrder).toBeLessThan(provisioningOrder);
	});

	it('does not hold when trials are available', async () => {
		mockAvailability(2, false);

		await expect(
			new ProductPurchaseSolutionTrial(account, product).getNextStepsLink(
				{id: 5} as Cart
			)
		).resolves.toBe('/next-steps?orderId=5&state=');
	});

	it('treats a fallback availability as not on hold', async () => {
		mockAvailability(0, true);

		const productPurchase = new ProductPurchaseSolutionTrial(
			account,
			product
		);

		await expect(productPurchase.isTrialOnHold()).resolves.toBe(false);
		await expect(
			productPurchase.getNextStepsLink({id: 5} as Cart)
		).resolves.toBe('/next-steps?orderId=5&state=');
	});
});
