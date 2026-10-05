/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import CommerceUI from '~/services/headless/CommerceUI';
import HeadlessCommerceAdminAccount from '~/services/headless/HeadlessCommerceAdminAccount';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Analytics} from '~/services/liferay/Analytics';
import {Liferay} from '~/services/liferay/liferay';

import ProductPurchase from './ProductPurchase';

import type {Account, AccountAddress} from '~/types/accounts';
import type {APIResponse} from '~/types/api';
import type {Cart, OrderTypes} from '~/types/orders';
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

class TypedProductPurchase extends ProductPurchase {
	protected orderTypeExternalReferenceCode: OrderTypes = 'SSA_SAAS';
}

const account = {id: 1} as Account;

const product = {
	id: 10,
	name: 'Product',
	productId: 20,
	skus: [{id: 30}, {id: 31}],
} as DeliveryProduct;

function expectedCartItems(productId = 20) {
	return [
		{
			price: {currency: 'USD', discount: 0},
			productId,
			quantity: 1,
			settings: {maxQuantity: 1},
			skuId: 30,
		},
	];
}

function mockAccountAddresses(addresses: AccountAddress[]) {
	vi.mocked(
		HeadlessCommerceAdminAccount.getAccountAddresses
	).mockResolvedValue({items: addresses} as APIResponse<AccountAddress>);
}

function getCreatedCart() {
	return vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock
		.calls[0][1] as Cart;
}

describe('[CLIENT-COMMERCE-PRODUCTPURCHASE] ProductPurchase', () => {
	const commerceContext = {...Liferay.CommerceContext};

	beforeEach(() => {
		Object.assign(Liferay.CommerceContext, {
			commerceChannelId: '99',
			currency: {currencyCode: 'USD'},
		});

		mockAccountAddresses([]);

		vi.mocked(HeadlessCommerceDeliveryCart.checkoutCart).mockResolvedValue({
			valid: true,
		} as Cart);
		vi.mocked(HeadlessCommerceDeliveryCart.createCart).mockResolvedValue({
			id: 5,
		} as Cart);
		vi.mocked(HeadlessCommerceDeliveryCart.updateCart).mockResolvedValue({
			id: 6,
		} as Cart);
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};

		vi.clearAllMocks();
	});

	it('creates a cart with the first SKU at quantity 1, then selects the account, checks out, and tracks', async () => {
		const newCart = await new ProductPurchase(
			account,
			product
		).createOrder();

		expect(newCart).toEqual({id: 5});
		expect(HeadlessCommerceDeliveryCart.createCart).toHaveBeenCalledWith(
			'99',
			{
				accountId: 1,
				cartItems: expectedCartItems(),
				currencyCode: 'USD',
				orderTypeExternalReferenceCode: undefined,
			}
		);
		expect(HeadlessCommerceDeliveryCart.updateCart).not.toHaveBeenCalled();
		expect(CommerceUI.selectAccount).toHaveBeenCalledWith(1);
		expect(HeadlessCommerceDeliveryCart.checkoutCart).toHaveBeenCalledWith(
			5
		);
		expect(Analytics.track).toHaveBeenCalledWith('ORDER_CREATION', {
			accountId: 1,
			orderTypeExternalReferenceCode: undefined,
			productName: 'Product',
		});

		const [createOrder] = vi.mocked(HeadlessCommerceDeliveryCart.createCart)
			.mock.invocationCallOrder;
		const [checkoutOrder] = vi.mocked(
			HeadlessCommerceDeliveryCart.checkoutCart
		).mock.invocationCallOrder;
		const [trackOrder] = vi.mocked(Analytics.track).mock
			.invocationCallOrder;

		expect(createOrder).toBeLessThan(checkoutOrder);
		expect(checkoutOrder).toBeLessThan(trackOrder);
	});

	it("creates the cart with the account's default billing address", async () => {
		mockAccountAddresses([
			{id: 2, type: 3},
			{defaultBilling: true, id: 5, type: 2},
		] as AccountAddress[]);

		await new ProductPurchase(account, product).createOrder();

		expect(
			HeadlessCommerceAdminAccount.getAccountAddresses
		).toHaveBeenCalledWith(1);
		expect(getCreatedCart()).toMatchObject({
			accountId: 1,
			billingAddressId: 5,
		});
	});

	it('falls back to a billing capable address when none is the default', async () => {
		mockAccountAddresses([
			{id: 2, type: 3},
			{id: 3, type: 1},
		] as AccountAddress[]);

		await new ProductPurchase(account, product).createOrder();

		expect(getCreatedCart().billingAddressId).toBe(3);
	});

	it('sends no billing address when the account only has shipping addresses', async () => {
		mockAccountAddresses([{id: 2, type: 3}] as AccountAddress[]);

		await new ProductPurchase(account, product).createOrder();

		expect(getCreatedCart().billingAddressId).toBeUndefined();
	});

	it('keeps the billing address the caller passed', async () => {
		await new ProductPurchase(account, product).createOrder({
			billingAddress: {name: 'Billing'},
		} as Cart);

		expect(
			HeadlessCommerceAdminAccount.getAccountAddresses
		).not.toHaveBeenCalled();
		expect(getCreatedCart()).toMatchObject({
			billingAddress: {name: 'Billing'},
		});
		expect(getCreatedCart().billingAddressId).toBeUndefined();
	});

	it('rejects when the portal refuses the checkout', async () => {
		vi.mocked(HeadlessCommerceDeliveryCart.checkoutCart).mockResolvedValue({
			errorMessages: ['Invalid billing address'],
			id: 5,
			valid: false,
		} as Cart);

		await expect(
			new ProductPurchase(account, product).createOrder()
		).rejects.toThrow('Invalid billing address');
		expect(Analytics.track).not.toHaveBeenCalled();
	});

	it('falls back to the payment callback when no payment URL returns', async () => {
		vi.mocked(
			HeadlessCommerceDeliveryCart.getPaymentMethodURL
		).mockResolvedValue('');

		const callback = `${window.location.origin}/next-steps?orderId=5`;

		await expect(
			new ProductPurchase(account, product).getPaymentNextStepsLink({
				id: 5,
			} as Cart)
		).resolves.toBe(callback);
		expect(
			HeadlessCommerceDeliveryCart.getPaymentMethodURL
		).toHaveBeenCalledWith(5, callback);
	});

	it('forces the order type of the purchase onto the body', async () => {
		await new TypedProductPurchase(account, product).createOrder({
			orderTypeExternalReferenceCode: 'DXP',
		} as Cart);

		expect(
			vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock.calls[0][1]
		).toMatchObject({orderTypeExternalReferenceCode: 'SSA_SAAS'});
		expect(Analytics.track).toHaveBeenCalledWith('ORDER_CREATION', {
			accountId: 1,
			orderTypeExternalReferenceCode: 'SSA_SAAS',
			productName: 'Product',
		});
	});

	it('links to next steps by order ID', async () => {
		await expect(
			new ProductPurchase(account, product).getNextStepsLink({
				id: 5,
			} as Cart)
		).resolves.toBe('/next-steps?orderId=5');
	});

	it('returns the payment URL when one returns', async () => {
		vi.mocked(
			HeadlessCommerceDeliveryCart.getPaymentMethodURL
		).mockResolvedValue('https://pay.example.com');

		await expect(
			new ProductPurchase(account, product).getPaymentNextStepsLink({
				id: 5,
			} as Cart)
		).resolves.toBe('https://pay.example.com');
	});

	it('selects the account and checks out in parallel', async () => {
		let resolveSelectAccount: (value: Response) => void = () => {};

		vi.mocked(CommerceUI.selectAccount).mockReturnValue(
			new Promise((resolve) => {
				resolveSelectAccount = resolve;
			})
		);

		const createOrderPromise = new ProductPurchase(
			account,
			product
		).createOrder();

		await vi.waitFor(() => {
			expect(CommerceUI.selectAccount).toHaveBeenCalled();
		});

		expect(HeadlessCommerceDeliveryCart.checkoutCart).toHaveBeenCalledWith(
			5
		);
		expect(Analytics.track).not.toHaveBeenCalled();

		resolveSelectAccount(new Response());

		await createOrderPromise;

		expect(Analytics.track).toHaveBeenCalled();
	});

	it('updates the cart when the cart has an ID', async () => {
		const newCart = await new ProductPurchase(account, {
			id: 10,
			name: 'Product',
			skus: [{id: 30}],
		} as DeliveryProduct).createOrder({id: 6} as Cart);

		expect(newCart).toEqual({id: 6});
		expect(
			HeadlessCommerceAdminAccount.getAccountAddresses
		).not.toHaveBeenCalled();
		expect(HeadlessCommerceDeliveryCart.createCart).not.toHaveBeenCalled();
		expect(HeadlessCommerceDeliveryCart.updateCart).toHaveBeenCalledWith(
			6,
			{
				accountId: 1,
				cartItems: expectedCartItems(10),
				currencyCode: 'USD',
				id: 6,
				orderTypeExternalReferenceCode: undefined,
			}
		);
		expect(HeadlessCommerceDeliveryCart.checkoutCart).toHaveBeenCalledWith(
			6
		);
	});
});
