/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';

import AIHubTokenSelection from './AIHubTokenSelection';

vi.mock('~/hooks/useAITokenBlockSizes', () => ({
	useAITokenBlockSizes: () => ({
		error: undefined,
		isLoading: false,
		tokenBlockSizes: new Map([['SKU-5000', 5000]]),
	}),
}));

vi.mock(
	'~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout',
	() => ({
		useProductPurchaseLayoutContext: vi.fn(),
	})
);

vi.mock('~/pages/ProductPurchase/context/AppPurchaseContext', () => ({
	useAppPurchaseContext: () => ({setLicenseType: vi.fn()}),
}));

vi.mock('~/pages/ProductPurchase/context/CartContext', () => {
	const cartContext = {
		reset: vi.fn(),
		setCart: vi.fn(),
		setCartItems: vi.fn(),
	};

	return {useCartContext: () => cartContext};
});

vi.mock('~/services/headless/HeadlessCommerceDeliveryCart', () => ({
	default: {getAccountCarts: vi.fn()},
}));

describe('[FLOW-AI-HUB-PURCHASE] AIHubTokenSelection', () => {
	const addCart = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		addCart.mockReturnValue(new Promise(() => {}));

		vi.mocked(
			HeadlessCommerceDeliveryCart.getAccountCarts
		).mockResolvedValue({items: []} as never);

		vi.mocked(useProductPurchaseLayoutContext).mockReturnValue({
			actions: {nextStep: vi.fn()},
			product: {
				id: 10,
				productId: 20,
				skus: [
					{
						externalReferenceCode: 'SKU-5000',
						id: 30,
						price: {priceFormatted: '$ 250.00'},
						purchasable: true,
					},
				],
			},
			productPurchaseCart: {
				addCart,
				cart: {},
				cartItems: [],
				removeCart: vi.fn(),
			},
			selectedAccount: {id: 1},
		} as unknown as ReturnType<typeof useProductPurchaseLayoutContext>);
	});

	it('creates one cart when the radio and its card both report the same click', async () => {
		render(<AIHubTokenSelection />);

		await waitFor(() =>
			expect(
				HeadlessCommerceDeliveryCart.getAccountCarts
			).toHaveBeenCalled()
		);

		fireEvent.click(screen.getByRole('radio'));

		expect(addCart).toHaveBeenCalledTimes(1);
		expect(addCart).toHaveBeenCalledWith(20, 30);
	});
});
