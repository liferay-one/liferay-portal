/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminAccount from '~/services/headless/HeadlessCommerceAdminAccount';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Liferay} from '~/services/liferay/liferay';

import {ProductPurchaseAIHub} from './ProductPurchaseAIHub';

import type {Account} from '~/types/accounts';
import type {Cart} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';
import type {SalesforceProject} from '~/types/salesforceProject';

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

type AIHubForm = Parameters<ProductPurchaseAIHub['setForm']>[0];

const account = {id: 1} as Account;

const form = {aiHubAccountName: 'Acme AI', purpose: 'Testing'} as AIHubForm;

const product = {
	id: 10,
	name: 'AI Hub',
	productId: 20,
	skus: [{id: 30}],
} as DeliveryProduct;

function getCreatedCart() {
	return vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock
		.calls[0][1] as Cart;
}

describe('[CLIENT-COMMERCE-PRODUCTPURCHASEAIHUB] ProductPurchaseAIHub', () => {
	const commerceContext = {...Liferay.CommerceContext};

	beforeEach(() => {
		Object.assign(Liferay.CommerceContext, {
			commerceChannelId: '99',
			currency: {currencyCode: 'USD'},
		});

		vi.mocked(
			HeadlessCommerceAdminAccount.getAccountAddresses
		).mockResolvedValue({items: []} as never);
		vi.mocked(HeadlessCommerceDeliveryCart.checkoutCart).mockResolvedValue({
			valid: true,
		} as Cart);
		vi.mocked(HeadlessCommerceDeliveryCart.createCart).mockResolvedValue({
			id: 5,
		} as Cart);
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};

		vi.clearAllMocks();
	});

	it('carries only the form in the order metadata when no project exists', async () => {
		const productPurchase = new ProductPurchaseAIHub(
			account,
			product,
			null
		);

		productPurchase.setForm(form);

		await productPurchase.createOrder();

		expect(getCreatedCart().customFields).toEqual({
			'order-metadata': JSON.stringify({aiHubForm: form}),
		});
	});

	it('carries the form and the project ERC in the order metadata with the AI_HUB order type', async () => {
		const productPurchase = new ProductPurchaseAIHub(account, product, {
			externalReferenceCode: 'PRJCT-1',
		} as SalesforceProject);

		productPurchase.setForm(form);

		await expect(productPurchase.createOrder()).resolves.toEqual({id: 5});

		const cart = getCreatedCart();

		expect(cart.customFields).toEqual({
			'order-metadata': JSON.stringify({
				aiHubForm: form,
				salesforceProjectId: 'PRJCT-1',
			}),
		});
		expect(cart.orderTypeExternalReferenceCode).toBe('AI_HUB');
		expect(cart.cartItems[0]).toMatchObject({quantity: 1, skuId: 30});
	});

	it('goes to the base next steps link for a cart that is not AI_HUB', async () => {
		await expect(
			new ProductPurchaseAIHub(account, product).getNextStepsLink({
				id: 5,
				orderTypeExternalReferenceCode: 'DXP',
			} as Cart)
		).resolves.toBe('/next-steps?orderId=5');
	});

	it('goes to the portal next steps URL for an AI_HUB cart', async () => {
		await expect(
			new ProductPurchaseAIHub(account, product).getNextStepsLink({
				id: 5,
				orderTypeExternalReferenceCode: 'AI_HUB',
			} as Cart)
		).resolves.toBe(`${window.location.origin}/next-steps?orderId=5`);
	});

	it('throws when the form is missing', async () => {
		await expect(
			new ProductPurchaseAIHub(account, product).createOrder()
		).rejects.toThrow('Form is missing.');
		expect(HeadlessCommerceDeliveryCart.createCart).not.toHaveBeenCalled();
	});
});
