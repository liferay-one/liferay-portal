/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Liferay} from '~/services/liferay/liferay';

import {useCartContext} from '../context/CartContext';

import type {ChannelCurrency} from '~/types/commerce';
import type {CartItem} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

const useProductPurchaseCart = (
	accountCurrency: ChannelCurrency | undefined,
	accountId: number | undefined,
	billingAddressId: number | undefined,
	orderTypeExternalReferenceCode: string | undefined,
	product: DeliveryProduct | undefined
) => {
	const [isSyncingCart, setSyncingCart] = useState(
		Boolean(accountId && product)
	);
	const [isUpdatingBillingAddress, setUpdatingBillingAddress] =
		useState(false);

	const channelId = Liferay.CommerceContext.commerceChannelId;

	const billingAddressIdRef = useRef(billingAddressId);

	billingAddressIdRef.current = billingAddressId;

	const currencyCode =
		accountCurrency?.code ?? Liferay.CommerceContext.currency.currencyCode;

	const {cart, cartItems, reset, setCart, setCartItems} = useCartContext();

	const cartId = cart?.id;

	const cartIdRef = useRef(cartId);

	cartIdRef.current = cartId;

	const updateBillingAddress = useCallback(
		async (newBillingAddressId?: number) => {
			const updatedCartId = cartIdRef.current;

			if (!newBillingAddressId || !updatedCartId) {
				return;
			}

			setUpdatingBillingAddress(true);

			try {
				const updatedCart =
					await HeadlessCommerceDeliveryCart.updateCart(
						updatedCartId,
						{billingAddressId: newBillingAddressId}
					);

				if (updatedCart && cartIdRef.current === updatedCartId) {
					setCart(updatedCart);
				}
			}
			catch (error) {
				console.error(
					'Unable to update the cart billing address',
					error
				);
			}
			finally {
				setUpdatingBillingAddress(false);
			}
		},
		[setCart]
	);

	const addCart = async (productId: number, skuId: number) => {
		let currentCart = cart;

		if (!cartId) {
			currentCart = await HeadlessCommerceDeliveryCart.createCart(
				channelId,
				{
					accountId,
					billingAddressId,
					currencyCode,
					orderTypeExternalReferenceCode,
				}
			);

			setCart(currentCart);
		}

		const existingItem = cartItems.find((item) => item.skuId === skuId);

		const newCartItems = existingItem
			? cartItems.map((item) =>
					item.skuId === skuId
						? {...item, quantity: item.quantity + 1}
						: item
				)
			: [...cartItems, {productId, quantity: 1, skuId} as CartItem];

		setCartItems(newCartItems);

		return {
			...currentCart,
			cartItems: newCartItems,
		};
	};

	const removeFromCart = async (skuId: number) => {
		const newCartItems = cartItems
			.map((item) =>
				item.skuId === skuId
					? {...item, quantity: item.quantity - 1}
					: item
			)
			.filter((item) => item.quantity > 0);

		setCartItems(newCartItems);
	};

	const removeCart = useCallback(
		(id: number) =>
			HeadlessCommerceDeliveryCart.deleteCart(id)
				.then(() => {
					reset();
				})
				.catch(console.error),
		[reset]
	);

	useEffect(() => {
		let active = true;

		const syncCart = async () => {
			if (!accountId || !product) {
				return;
			}

			const {items: carts} =
				await HeadlessCommerceDeliveryCart.getAccountCarts(
					accountId,
					channelId
				);

			const openCart = carts?.find(
				(cart) =>
					cart.orderTypeExternalReferenceCode ===
						orderTypeExternalReferenceCode &&
					(!cart.author ||
						cart.author === Liferay.ThemeDisplay.getUserName())
			);

			if (openCart?.orderStatusInfo?.label !== 'open') {
				return;
			}

			const {items: openCartItems} =
				await HeadlessCommerceDeliveryCart.getCartItems(openCart.id);

			const hasCorrectProduct = openCartItems.some(
				(cartItem) =>
					cartItem.productId === (product.productId ?? product.id)
			);

			if (!active) {
				return;
			}

			if (!hasCorrectProduct) {
				return removeCart(openCart.id);
			}

			if (
				accountCurrency &&
				!Object.values(accountCurrency.name).includes(
					openCart.summary?.currency ?? ''
				)
			) {
				const accountCurrencyCartItems = openCartItems.map(
					({productId, quantity, skuId}) =>
						({productId, quantity, skuId}) as CartItem
				);

				try {
					const accountCurrencyCart =
						await HeadlessCommerceDeliveryCart.createCart(
							channelId,
							{
								accountId,
								billingAddressId: billingAddressIdRef.current,
								cartItems: accountCurrencyCartItems,
								currencyCode: accountCurrency.code,
								orderTypeExternalReferenceCode,
							}
						);

					await HeadlessCommerceDeliveryCart.deleteCart(openCart.id);

					if (!active) {
						return;
					}

					setCart(accountCurrencyCart);
					setCartItems(accountCurrencyCartItems);
				}
				catch (error) {
					console.error('Unable to change the cart currency', error);
				}

				return;
			}

			setCart(openCart);
			setCartItems(openCartItems);
		};

		setSyncingCart(true);

		syncCart()
			.catch((error) => console.error('Unable to load the cart', error))
			.finally(() => {
				if (active) {
					setSyncingCart(false);
				}
			});

		return () => {
			active = false;
		};
	}, [
		accountCurrency,
		accountId,
		channelId,
		orderTypeExternalReferenceCode,
		product,
		removeCart,
		setCart,
		setCartItems,
	]);

	return {
		addCart,
		cart,
		cartItems,
		isSyncingCart,
		isUpdatingBillingAddress,
		removeCart,
		removeFromCart,
		reset,
		setCart,
		updateBillingAddress,
		updateCart: HeadlessCommerceDeliveryCart.updateCart.bind(
			HeadlessCommerceDeliveryCart
		),
	};
};

export default useProductPurchaseCart;
