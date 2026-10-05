/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';

import {useCartContext} from '../context/CartContext';
import useProductPurchaseCart from './useProductPurchaseCart';

import type {DeliveryProduct} from '~/types/product';

vi.mock('~/services/headless/HeadlessCommerceDeliveryCart', () => ({
	default: {
		createCart: vi.fn(),
		deleteCart: vi.fn(),
		getAccountCarts: vi.fn(),
		getCartItems: vi.fn(),
		updateCart: vi.fn(),
	},
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		CommerceContext: {
			commerceChannelId: 77,
			currency: {currencyCode: 'USD'},
		},
		ThemeDisplay: {getUserName: () => 'Test User'},
	},
}));

vi.mock('../context/CartContext', () => ({
	useCartContext: vi.fn(),
}));

const cartAPI = vi.mocked(HeadlessCommerceDeliveryCart);

const product = {id: 100, productId: 10} as DeliveryProduct;

let cartContext: {
	cart: unknown;
	cartItems: {productId: number; quantity: number; skuId: number}[];
	reset: ReturnType<typeof vi.fn>;
	setCart: ReturnType<typeof vi.fn>;
	setCartItems: ReturnType<typeof vi.fn>;
};

function mockCartContext(
	cart: unknown,
	cartItems: {productId: number; quantity: number; skuId: number}[] = []
) {
	cartContext = {
		cart,
		cartItems,
		reset: vi.fn(),
		setCart: vi.fn(),
		setCartItems: vi.fn(),
	};

	vi.mocked(useCartContext).mockReturnValue(
		cartContext as unknown as ReturnType<typeof useCartContext>
	);
}

function mockAccountCarts(carts: unknown[]) {
	cartAPI.getAccountCarts.mockResolvedValue({items: carts} as never);
}

describe('[HOOK-PRODUCTPURCHASE-USEPRODUCTPURCHASECART] useProductPurchaseCart', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		cartAPI.deleteCart.mockResolvedValue(undefined as never);
		mockAccountCarts([]);
		mockCartContext(undefined);
	});

	describe('addCart', () => {
		it('creates a cart when none exists and appends a new item', async () => {
			cartAPI.createCart.mockResolvedValue({id: 5} as never);

			const {result} = renderHook(() =>
				useProductPurchaseCart(1, undefined, 'DXP')
			);

			let returnedCart: unknown;

			await act(async () => {
				returnedCart = await result.current.addCart(10, 20);
			});

			expect(cartAPI.createCart).toHaveBeenCalledWith(77, {
				accountId: 1,
				currencyCode: 'USD',
				orderTypeExternalReferenceCode: 'DXP',
			});
			expect(cartContext.setCart).toHaveBeenCalledWith({id: 5});
			expect(cartContext.setCartItems).toHaveBeenCalledWith([
				{productId: 10, quantity: 1, skuId: 20},
			]);
			expect(returnedCart).toEqual({
				cartItems: [{productId: 10, quantity: 1, skuId: 20}],
				id: 5,
			});
		});

		it('increments the quantity of an existing SKU without creating a cart', async () => {
			mockCartContext({id: 5}, [
				{productId: 10, quantity: 2, skuId: 20},
				{productId: 11, quantity: 1, skuId: 21},
			]);

			const {result} = renderHook(() =>
				useProductPurchaseCart(1, undefined, 'DXP')
			);

			await act(async () => {
				await result.current.addCart(10, 20);
			});

			expect(cartAPI.createCart).not.toHaveBeenCalled();
			expect(cartContext.setCart).not.toHaveBeenCalled();
			expect(cartContext.setCartItems).toHaveBeenCalledWith([
				{productId: 10, quantity: 3, skuId: 20},
				{productId: 11, quantity: 1, skuId: 21},
			]);
		});

		it('appends a new SKU to an existing cart', async () => {
			mockCartContext({id: 5}, [{productId: 10, quantity: 1, skuId: 20}]);

			const {result} = renderHook(() =>
				useProductPurchaseCart(1, undefined, 'DXP')
			);

			await act(async () => {
				await result.current.addCart(12, 22);
			});

			expect(cartAPI.createCart).not.toHaveBeenCalled();
			expect(cartContext.setCartItems).toHaveBeenCalledWith([
				{productId: 10, quantity: 1, skuId: 20},
				{productId: 12, quantity: 1, skuId: 22},
			]);
		});
	});

	describe('removeFromCart', () => {
		it('decrements the quantity of a SKU', async () => {
			mockCartContext({id: 5}, [{productId: 10, quantity: 2, skuId: 20}]);

			const {result} = renderHook(() =>
				useProductPurchaseCart(1, undefined, 'DXP')
			);

			await act(async () => {
				await result.current.removeFromCart(20);
			});

			expect(cartContext.setCartItems).toHaveBeenCalledWith([
				{productId: 10, quantity: 1, skuId: 20},
			]);
		});

		it('drops a SKU whose quantity reaches zero', async () => {
			mockCartContext({id: 5}, [
				{productId: 10, quantity: 1, skuId: 20},
				{productId: 11, quantity: 1, skuId: 21},
			]);

			const {result} = renderHook(() =>
				useProductPurchaseCart(1, undefined, 'DXP')
			);

			await act(async () => {
				await result.current.removeFromCart(20);
			});

			expect(cartContext.setCartItems).toHaveBeenCalledWith([
				{productId: 11, quantity: 1, skuId: 21},
			]);
		});
	});

	describe('open cart restore', () => {
		it('does not load carts without an account or a product', async () => {
			renderHook(() => useProductPurchaseCart(undefined, product, 'DXP'));
			renderHook(() => useProductPurchaseCart(1, undefined, 'DXP'));

			await Promise.resolve();

			expect(cartAPI.getAccountCarts).not.toHaveBeenCalled();
		});

		it('restores an open cart matching the order type and author that holds the product', async () => {
			const openCart = {
				author: 'Test User',
				id: 9,
				orderStatusInfo: {label: 'open'},
				orderTypeExternalReferenceCode: 'DXP',
			};
			const openCartItems = [{productId: 10, quantity: 1, skuId: 20}];

			mockAccountCarts([
				{
					id: 8,
					orderStatusInfo: {label: 'open'},
					orderTypeExternalReferenceCode: 'OTHER',
				},
				openCart,
			]);
			cartAPI.getCartItems.mockResolvedValue({
				items: openCartItems,
			} as never);

			renderHook(() => useProductPurchaseCart(1, product, 'DXP'));

			await waitFor(() =>
				expect(cartContext.setCart).toHaveBeenCalledWith(openCart)
			);

			expect(cartAPI.getAccountCarts).toHaveBeenCalledWith(1, 77);
			expect(cartAPI.getCartItems).toHaveBeenCalledWith(9);
			expect(cartContext.setCartItems).toHaveBeenCalledWith(
				openCartItems
			);
			expect(cartAPI.deleteCart).not.toHaveBeenCalled();
		});

		it('restores an open cart with no author when it holds the product by ID', async () => {
			const openCart = {
				id: 9,
				orderStatusInfo: {label: 'open'},
				orderTypeExternalReferenceCode: 'DXP',
			};

			mockAccountCarts([openCart]);
			cartAPI.getCartItems.mockResolvedValue({
				items: [{productId: 100, quantity: 1, skuId: 20}],
			} as never);

			renderHook(() =>
				useProductPurchaseCart(1, {id: 100} as DeliveryProduct, 'DXP')
			);

			await waitFor(() =>
				expect(cartContext.setCart).toHaveBeenCalledWith(openCart)
			);
		});

		it('deletes an open cart that lacks the product and resets the cart', async () => {
			mockAccountCarts([
				{
					author: 'Test User',
					id: 9,
					orderStatusInfo: {label: 'open'},
					orderTypeExternalReferenceCode: 'DXP',
				},
			]);
			cartAPI.getCartItems.mockResolvedValue({
				items: [{productId: 99, quantity: 1, skuId: 20}],
			} as never);

			renderHook(() => useProductPurchaseCart(1, product, 'DXP'));

			await waitFor(() => expect(cartContext.reset).toHaveBeenCalled());

			expect(cartAPI.deleteCart).toHaveBeenCalledWith(9);
			expect(cartContext.setCart).not.toHaveBeenCalled();
			expect(cartContext.setCartItems).not.toHaveBeenCalled();
		});

		it('ignores a matching cart that is not open', async () => {
			mockAccountCarts([
				{
					author: 'Test User',
					id: 9,
					orderStatusInfo: {label: 'pending'},
					orderTypeExternalReferenceCode: 'DXP',
				},
			]);

			renderHook(() => useProductPurchaseCart(1, product, 'DXP'));

			await waitFor(() =>
				expect(cartAPI.getAccountCarts).toHaveBeenCalled()
			);
			await Promise.resolve();

			expect(cartAPI.getCartItems).not.toHaveBeenCalled();
			expect(cartAPI.deleteCart).not.toHaveBeenCalled();
			expect(cartContext.setCart).not.toHaveBeenCalled();
		});

		it('ignores an open cart written by another author', async () => {
			mockAccountCarts([
				{
					author: 'Someone Else',
					id: 9,
					orderStatusInfo: {label: 'open'},
					orderTypeExternalReferenceCode: 'DXP',
				},
			]);

			renderHook(() => useProductPurchaseCart(1, product, 'DXP'));

			await waitFor(() =>
				expect(cartAPI.getAccountCarts).toHaveBeenCalled()
			);
			await Promise.resolve();

			expect(cartAPI.getCartItems).not.toHaveBeenCalled();
			expect(cartContext.setCart).not.toHaveBeenCalled();
		});
	});
});
