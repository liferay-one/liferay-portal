/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Liferay} from '~/services/liferay/liferay';

import {ProductPurchaseAIHubOpenBeta} from './ProductPurchaseAIHubOpenBeta';

import type {Account} from '~/types/accounts';
import type {Cart} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';
import type {SalesforceContract} from '~/types/salesforceContract';

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

type AIHubOpenBetaForm = Parameters<ProductPurchaseAIHubOpenBeta['setForm']>[0];

const account = {id: 1} as Account;

const form = {
	aiHubAccountName: 'Acme AI',
	salesforceProjectId: 'PRJCT-1',
} as AIHubOpenBetaForm;

const product = {
	id: 10,
	name: 'AI Hub Open Beta',
	productId: 20,
	skus: [{id: 30}, {id: 31}],
} as DeliveryProduct;

describe('[CLIENT-COMMERCE-PRODUCTPURCHASEAIHUBOPENBETA] ProductPurchaseAIHubOpenBeta', () => {
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
	});

	it('merges the form, contract IDs, project ID, and tier into the order metadata and uses the SKU override', async () => {
		const productPurchase = new ProductPurchaseAIHubOpenBeta(
			account,
			product
		);

		productPurchase.setForm(form);
		productPurchase.setSalesforceContract({
			externalReferenceCode: 'CONTRACT-1',
			id: 77,
		} as SalesforceContract);
		productPurchase.setSKUId(31);
		productPurchase.setTier('gold');

		await productPurchase.createOrder(
			{
				customFields: {ignored: true} as Cart['customFields'],
				purchaseOrderNumber: 'PO-1',
			} as Cart,
			{}
		);

		const cart = vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock
			.calls[0][1] as Cart;

		expect(cart.customFields).toEqual({
			'order-metadata': JSON.stringify({
				aiHubForm: form,
				contractEntityId: 77,
				salesforceContractId: 'CONTRACT-1',
				salesforceProjectId: 'PRJCT-1',
				tier: 'gold',
			}),
		});
		expect(cart.cartItems[0]).toMatchObject({quantity: 1, skuId: 31});
		expect(cart.orderTypeExternalReferenceCode).toBe('AI_HUB');
		expect(cart.purchaseOrderNumber).toBe('PO-1');
	});

	it('resolves next steps through the payment URL', async () => {
		vi.mocked(
			HeadlessCommerceDeliveryCart.getPaymentMethodURL
		).mockResolvedValue('https://pay.example.com');

		await expect(
			new ProductPurchaseAIHubOpenBeta(account, product).getNextStepsLink(
				{id: 5} as Cart
			)
		).resolves.toBe('https://pay.example.com');
		expect(
			HeadlessCommerceDeliveryCart.getPaymentMethodURL
		).toHaveBeenCalledWith(
			5,
			`${window.location.origin}/next-steps?orderId=5`
		);
	});

	it('throws when the form is missing', async () => {
		await expect(
			new ProductPurchaseAIHubOpenBeta(account, product).createOrder(
				{} as Cart,
				{}
			)
		).rejects.toThrow('Form is missing.');
		expect(HeadlessCommerceDeliveryCart.createCart).not.toHaveBeenCalled();
	});
});
