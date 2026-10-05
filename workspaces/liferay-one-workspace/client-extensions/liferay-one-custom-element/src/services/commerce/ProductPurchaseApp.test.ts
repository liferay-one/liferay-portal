/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminAccount from '~/services/headless/HeadlessCommerceAdminAccount';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Analytics} from '~/services/liferay/Analytics';
import {Liferay} from '~/services/liferay/liferay';
import GetAppInformations from '~/services/objects/GetAppInformations';

import ProductPurchaseApp from './ProductPurchaseApp';

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

vi.mock('~/services/objects/GetAppInformations', () => ({
	default: {postGetAppInformation: vi.fn()},
}));

const account = {id: 1} as Account;

function createProduct(specifications: Record<string, string>) {
	return {
		id: 10,
		name: 'App',
		productId: 20,
		productSpecifications: Object.entries(specifications).map(
			([specificationKey, value]) => ({specificationKey, value})
		),
		skus: [
			{
				id: 30,
				purchasable: true,
				skuOptions: [
					{
						skuOptionKey: 'dxp-license-usage-type',
						skuOptionValueKey: 'trial',
					},
				],
			},
			{
				id: 31,
				purchasable: true,
				skuOptions: [
					{
						skuOptionKey: 'dxp-license-usage-type',
						skuOptionValueKey: 'standard',
					},
				],
			},
		],
	} as DeliveryProduct;
}

function getCreatedCart() {
	return vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock
		.calls[0][1] as Cart;
}

const product = createProduct({'price-model': 'Free', 'type': 'dxp'});

describe('[CLIENT-COMMERCE-PRODUCTPURCHASEAPP] ProductPurchaseApp', () => {
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

	beforeEach(() => {
		vi.mocked(GetAppInformations.postGetAppInformation).mockResolvedValue(
			{} as never
		);
	});

	it('adds project metadata only with a Salesforce project', async () => {
		await new ProductPurchaseApp(account, product, {
			externalReferenceCode: 'PRJCT-1',
		} as SalesforceProject).createOrder();

		expect(getCreatedCart().customFields).toEqual({
			'order-metadata': JSON.stringify({salesforceProjectId: 'PRJCT-1'}),
		});

		vi.mocked(HeadlessCommerceDeliveryCart.createCart).mockClear();

		await new ProductPurchaseApp(account, product, null).createOrder();

		expect(getCreatedCart().customFields).toEqual({});
	});

	it('chooses the standard SKU when no cart is passed', async () => {
		await new ProductPurchaseApp(account, product).createOrder();

		expect(getCreatedCart().cartItems).toEqual([
			expect.objectContaining({productId: 20, quantity: 1, skuId: 31}),
		]);
	});

	it('derives the order type from the app type specification', async () => {
		await new ProductPurchaseApp(account, product).createOrder();

		expect(getCreatedCart().orderTypeExternalReferenceCode).toBe('DXP_APP');
		expect(
			ProductPurchaseApp.getOrderTypeExternalReferenceCode(
				createProduct({type: 'cloud'})
			)
		).toBe('CLOUD_APP');
	});

	it('keeps the cart items of a passed cart', async () => {
		const cartItems = [{quantity: 2, skuId: 99}] as Cart['cartItems'];

		await new ProductPurchaseApp(account, product).createOrder({
			cartItems,
		} as Cart);

		expect(getCreatedCart().cartItems).toEqual(cartItems);
	});

	it('links to purchase completed', async () => {
		await expect(
			new ProductPurchaseApp(account, product).getNextStepsLink({
				id: 5,
			} as Cart)
		).resolves.toBe('/purchase-completed?orderId=5');
	});

	it('logs a failed get app information post without failing the order', async () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});
		const postError = new Error('Unable to post');

		vi.mocked(GetAppInformations.postGetAppInformation).mockRejectedValue(
			postError
		);

		await expect(
			new ProductPurchaseApp(account, product).createOrder()
		).resolves.toEqual({id: 5});
		expect(consoleError).toHaveBeenCalledWith(postError);
	});

	it('posts the get app information after the order and tracks the app purchase', async () => {
		await new ProductPurchaseApp(account, product).createOrder();

		expect(GetAppInformations.postGetAppInformation).toHaveBeenCalledWith({
			dashboardLink: '/my-account',
			orderId: '5',
			priceModel: 'free',
			productName: 'App',
			productType: 'dxp',
		});
		expect(Analytics.track).toHaveBeenCalledWith('APP_PURCHASE', {
			isFreeApp: true,
			productName: 'App',
		});

		const [checkoutOrder] = vi.mocked(
			HeadlessCommerceDeliveryCart.checkoutCart
		).mock.invocationCallOrder;
		const [postOrder] = vi.mocked(GetAppInformations.postGetAppInformation)
			.mock.invocationCallOrder;

		expect(checkoutOrder).toBeLessThan(postOrder);
	});

	it('uses SEO_STUDIO as the order type for an SEO Studio product', async () => {
		await new ProductPurchaseApp(
			account,
			createProduct({'solution-type': 'seo-studio', 'type': 'dxp'})
		).createOrder();

		expect(getCreatedCart().orderTypeExternalReferenceCode).toBe(
			'SEO_STUDIO'
		);
	});
});
