/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminAccount from '~/services/headless/HeadlessCommerceAdminAccount';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Liferay} from '~/services/liferay/liferay';

import ProductPurchaseSSATrial from './ProductPurchaseSSATrial';

import type {Account} from '~/types/accounts';
import type {Cart} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

vi.mock('~/services/headless/CommerceUI', () => ({
	default: {selectAccount: vi.fn()},
}));

vi.mock('~/services/headless/HeadlessCommerceAdminAccount', () => ({
	default: {getAccountAddresses: vi.fn()},
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

const account = {id: 1} as Account;

const product = {
	id: 10,
	name: 'SSA',
	productId: 20,
	skus: [{id: 30}],
} as DeliveryProduct;

describe('[CLIENT-COMMERCE-PRODUCTPURCHASESSATRIAL] ProductPurchaseSSATrial', () => {
	const commerceContext = {...Liferay.CommerceContext};

	beforeEach(() => {
		Object.assign(Liferay.CommerceContext, {
			commerceChannelId: '99',
			currency: {currencyCode: 'USD'},
		});

		vi.mocked(
			HeadlessCommerceAdminAccount.getAccountAddresses
		).mockResolvedValue({items: []} as never);
		vi.mocked(HeadlessCommerceDeliveryCart.createCart).mockResolvedValue({
			id: 5,
		} as Cart);
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};

		vi.clearAllMocks();
	});

	it('creates an SSA_SAAS order when the checkout only reports a missing billing address', async () => {
		vi.mocked(HeadlessCommerceDeliveryCart.checkoutCart).mockResolvedValue({
			errorMessages: ['Invalid billing address'],
			valid: true,
		} as Cart);

		await expect(
			new ProductPurchaseSSATrial(account, product).createOrder()
		).resolves.toEqual({id: 5});

		expect(
			vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock.calls[0][1]
		).toMatchObject({orderTypeExternalReferenceCode: 'SSA_SAAS'});
	});

	it('rejects any other checkout error', async () => {
		vi.mocked(HeadlessCommerceDeliveryCart.checkoutCart).mockResolvedValue({
			errorMessages: ['Invalid shipping address'],
			valid: true,
		} as Cart);

		await expect(
			new ProductPurchaseSSATrial(account, product).createOrder()
		).rejects.toThrow('Invalid shipping address');
	});
});
