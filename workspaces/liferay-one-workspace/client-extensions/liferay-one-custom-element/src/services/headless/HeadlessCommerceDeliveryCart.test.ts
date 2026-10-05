/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';
import fetcher from '~/services/fetcher/fetcher';
import {Liferay} from '~/services/liferay/liferay';

import HeadlessCommerceDeliveryCart from './HeadlessCommerceDeliveryCart';

vi.mock('~/services/fetcher/fetcher', () => ({
	default: Object.assign(vi.fn(), {
		delete: vi.fn(),
		patch: vi.fn(),
		post: vi.fn(),
	}),
}));

const BASE_URL = '/o/headless-commerce-delivery-cart/v1.0';

describe('[CLIENT-HEADLESS-HEADLESSCOMMERCEDELIVERYCART] HeadlessCommerceDeliveryCart', () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('checks out, creates, and updates on fixed URLs', async () => {
		await HeadlessCommerceDeliveryCart.checkoutCart(1);
		await HeadlessCommerceDeliveryCart.createCart(2, {accountId: 3});
		await HeadlessCommerceDeliveryCart.updateCart(4, {accountId: 5});

		expect(vi.mocked(fetcher.post).mock.calls).toEqual([
			[`${BASE_URL}/carts/1/checkout`],
			[`${BASE_URL}/channels/2/carts`, {accountId: 3}],
		]);
		expect(fetcher.patch).toHaveBeenCalledWith(`${BASE_URL}/carts/4`, {
			accountId: 5,
		});
	});

	it('deletes and reads carts on fixed URLs', async () => {
		await HeadlessCommerceDeliveryCart.deleteCart(1);
		await HeadlessCommerceDeliveryCart.getAccountCarts(2, '3');
		await HeadlessCommerceDeliveryCart.getCart(4);
		await HeadlessCommerceDeliveryCart.getCartItems(5);

		expect(fetcher.delete).toHaveBeenCalledWith(`${BASE_URL}/carts/1`);
		expect(vi.mocked(fetcher).mock.calls).toEqual([
			[`${BASE_URL}/channels/3/account/2/carts?nestedFields=cartItems`],
			[`${BASE_URL}/carts/4`],
			[`${BASE_URL}/carts/5/items`],
		]);
	});

	it('encodes the callback URL and returns the payment URL text', async () => {
		const liferayFetch = vi
			.spyOn(Liferay.Util, 'fetch')
			.mockResolvedValue(
				new Response('https://pay.example.com', {status: 200})
			);

		await expect(
			HeadlessCommerceDeliveryCart.getPaymentMethodURL(
				7,
				'https://one.example.com/next-steps?orderId=7'
			)
		).resolves.toBe('https://pay.example.com');
		expect(liferayFetch).toHaveBeenCalledWith(
			`${BASE_URL}/carts/7/payment-url?callbackURL=https%3A%2F%2Fone.example.com%2Fnext-steps%3ForderId%3D7`
		);
	});

	it('throws a FetcherError with the status when the payment URL response is not ok', async () => {
		vi.spyOn(Liferay.Util, 'fetch').mockResolvedValue(
			new Response('', {status: 502})
		);

		const error = await HeadlessCommerceDeliveryCart.getPaymentMethodURL(
			7,
			'https://one.example.com'
		).catch((caughtError) => caughtError);

		expect(error).toBeInstanceOf(FetcherError);
		expect(error.message).toBe('Unable to get the payment URL');
		expect(error.status).toBe(502);
	});
});
