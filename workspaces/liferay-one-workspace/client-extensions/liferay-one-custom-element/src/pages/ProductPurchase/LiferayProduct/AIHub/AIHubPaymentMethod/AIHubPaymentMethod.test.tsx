/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';

import AIHubPaymentMethod from './AIHubPaymentMethod';

const {navigate} = vi.hoisted(() => ({navigate: vi.fn()}));

vi.mock('react-router', () => ({useNavigate: () => navigate}));

vi.mock(
	'~/pages/ProductPurchase/PaymentMethod/components/BillingAddress/BillingAddress',
	() => ({default: () => null})
);

vi.mock(
	'~/pages/ProductPurchase/PaymentMethod/components/PaymentTypeSelector/PaymentTypeSelector',
	() => ({default: () => null})
);

vi.mock(
	'~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout',
	() => ({
		useProductPurchaseLayoutContext: vi.fn(),
	})
);

vi.mock('~/pages/ProductPurchase/context/AppPurchaseContext', () => {
	const appPurchaseContext = {
		licenseType: 'TRIAL',
		payment: {billingAddress: {}, taxId: ''},
		setAccountTaxId: vi.fn(),
		setBillingAddress: vi.fn(),
		setPaymentMethodType: vi.fn(),
	};

	return {useAppPurchaseContext: () => appPurchaseContext};
});

vi.mock('~/pages/ProductPurchase/context/CartContext', () => ({
	useCartContext: () => ({setCart: vi.fn()}),
}));

vi.mock('~/pages/ProductPurchase/hooks/useAccountAddresses', () => ({
	default: () => ({data: {items: []}}),
}));

vi.mock('../TaxIdDisplay', () => ({default: () => null}));

function mockCartItems(cartItems: unknown[]) {
	vi.mocked(useProductPurchaseLayoutContext).mockReturnValue({
		actions: {nextStep: vi.fn(), previousStep: vi.fn()},
		handlePurchase: vi.fn(),
		isUpdatingCart: false,
		payment: {},
		product: {productId: 20},
		productPurchaseCart: {cart: {id: 5}, cartItems, updateCart: vi.fn()},
		selectedAccount: {id: 1},
	} as unknown as ReturnType<typeof useProductPurchaseLayoutContext>);
}

describe('[ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD] AIHubPaymentMethod', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns to the token selection when no token block is in the cart, as after a reload', () => {
		mockCartItems([]);

		render(<AIHubPaymentMethod />);

		expect(navigate).toHaveBeenCalledWith('/');
	});

	it('stays on the step when a token block is in the cart', () => {
		mockCartItems([{productId: 20, quantity: 1, skuId: 30}]);

		render(<AIHubPaymentMethod />);

		expect(navigate).not.toHaveBeenCalled();
	});
});
