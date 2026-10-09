/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminAccount from '~/services/headless/HeadlessCommerceAdminAccount';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Liferay} from '~/services/liferay/liferay';

import {ProductPurchaseSEOStudio} from './ProductPurchaseSEOStudio';

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

vi.mock('~/utils/siteUtils', () => ({
	getSiteURL: () => '/web/one',
}));

type SEOStudioForm = Parameters<ProductPurchaseSEOStudio['setForm']>[0];

const account = {externalReferenceCode: 'ACCOUNT-1', id: 1} as Account;

const form = {
	administratorEmailAddress: 'admin@acme.com',
	salesforceProjectId: 'PRJCT-1',
	salesforceProjectName: 'Acme Project',
} as SEOStudioForm;

const product = {
	externalReferenceCode: 'PRDCT-SEO',
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
		vi.restoreAllMocks();
	});

	it('carries the project and the form in the custom fields with the SEO_STUDIO order type', async () => {
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
			'projectName': 'Acme Project',
		});
		expect(cart.orderTypeExternalReferenceCode).toBe('SEO_STUDIO');
	});

	it('sends the buyer to the product on the project dashboard', async () => {
		const productPurchase = new ProductPurchaseSEOStudio(account, product);

		productPurchase.setForm(form);

		await expect(productPurchase.getNextStepsLink()).resolves.toBe(
			`${window.location.origin}/web/one/my-account#/ACCOUNT-1/project/PRJCT-1/products/PRDCT-SEO`
		);
		expect(
			HeadlessCommerceDeliveryCart.getPaymentMethodURL
		).not.toHaveBeenCalled();
	});

	it('throws when the form is missing for the next steps link', async () => {
		await expect(
			new ProductPurchaseSEOStudio(account, product).getNextStepsLink()
		).rejects.toThrow('Form is missing.');
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
