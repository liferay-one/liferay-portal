/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Liferay} from '~/services/liferay/liferay';

import {ProductPurchaseSEOStudio} from './ProductPurchaseSEOStudio';

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

type SEOStudioForm = Parameters<ProductPurchaseSEOStudio['setForm']>[0];

const account = {id: 1} as Account;

const form = {
	salesforceProjectId: 'PRJCT-1',
	seoStudioAccountName: 'Acme SEO',
} as SEOStudioForm;

const product = {
	id: 10,
	name: 'SEO Studio',
	productId: 20,
	skus: [{id: 30}],
} as DeliveryProduct;

function getCreatedCart() {
	return vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock
		.calls[0][1] as Cart;
}

describe('[CLIENT-COMMERCE-PRODUCTPURCHASESEOSTUDIO] ProductPurchaseSEOStudio', () => {
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

	it('carries the project ID and the form in the order metadata with the SEO_STUDIO order type', async () => {
		const productPurchase = new ProductPurchaseSEOStudio(account, product);

		productPurchase.setForm(form);

		await expect(productPurchase.createOrder({} as Cart)).resolves.toEqual({
			id: 5,
		});

		const cart = getCreatedCart();

		expect(cart.customFields).toEqual({
			'order-metadata': JSON.stringify({
				salesforceProjectId: 'PRJCT-1',
				seoStudioForm: form,
			}),
		});
		expect(cart.orderTypeExternalReferenceCode).toBe('SEO_STUDIO');
	});

	it('resolves next steps through the payment URL', async () => {
		vi.mocked(
			HeadlessCommerceDeliveryCart.getPaymentMethodURL
		).mockResolvedValue('https://pay.example.com');

		await expect(
			new ProductPurchaseSEOStudio(account, product).getNextStepsLink({
				id: 5,
			} as Cart)
		).resolves.toBe('https://pay.example.com');
	});

	it('throws when the form is missing', async () => {
		await expect(
			new ProductPurchaseSEOStudio(account, product).createOrder(
				{} as Cart
			)
		).rejects.toThrow('Form is missing.');
		expect(HeadlessCommerceDeliveryCart.createCart).not.toHaveBeenCalled();
	});
});
