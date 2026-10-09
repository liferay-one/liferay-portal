/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import {PaymentMethodType} from '~/pages/ProductPurchase/types';
import {Liferay} from '~/services/liferay/liferay';

import Summary from './Summary';

import type {ReactNode} from 'react';

vi.mock(
	'~/pages/ProductPurchase/components/LicenseTermsCheckbox/LicenseTermsCheckbox',
	() => ({
		default: () => null,
	})
);

vi.mock(
	'~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout',
	() => ({
		useProductPurchaseLayoutContext: vi.fn(),
	})
);

vi.mock(
	'~/pages/ProductPurchase/components/ProductPurchaseShell/ProductPurchaseShell',
	() => ({
		default: ({children}: {children: ReactNode}) => <div>{children}</div>,
	})
);

const cartSummary = {
	subtotalFormatted: '€ 263.56',
	taxValueFormatted: '€ 57.98',
	totalFormatted: '€ 321.54',
};

function getProduct(priceModel = 'paid') {
	return {
		productSpecifications: [
			{specificationKey: 'price-model', value: priceModel},
		],
		skus: [
			{id: 20, price: {priceFormatted: '€ 88.58'}},
			{id: 21, price: {priceFormatted: '€ 120.00'}},
		],
	};
}

function getRowValue(label: string) {
	return screen.getByText(`${label}:`).nextElementSibling?.textContent;
}

function mockLayoutContext({
	accountCurrencyCode,
	cart = {},
	cartItems = [],
	product = getProduct(),
}: {
	accountCurrencyCode?: string;
	cart?: unknown;
	cartItems?: unknown[];
	product?: unknown;
} = {}) {
	vi.mocked(useProductPurchaseLayoutContext).mockReturnValue({
		accountCurrencyCode,
		actions: {previousStep: vi.fn()},
		handlePurchase: vi.fn(),
		isSingleAccount: false,
		isSubmitting: false,
		payment: {
			billingAddress: {countryISOCode: 'IT', name: 'Acme'},
			type: PaymentMethodType.PAY_NOW,
		},
		product,
		productPurchaseCart: {cart, cartItems},
		selectedAccount: {id: 7},
	} as unknown as ReturnType<typeof useProductPurchaseLayoutContext>);
}

function renderSummary() {
	return render(
		<MemoryRouter>
			<Summary />
		</MemoryRouter>
	);
}

describe('[ROUTE-PRODUCT-PURCHASE-SUMMARY] Summary order summary prices', () => {
	const commerceContext = {...Liferay.CommerceContext};

	beforeEach(() => {
		vi.clearAllMocks();

		Liferay.CommerceContext.currency = {
			currencyCode: 'EUR',
			currencyId: '1',
		};
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};
	});

	it('shows the price of the SKU in the cart, and the tax and the total that the cart returns', () => {
		mockLayoutContext({
			cart: {summary: cartSummary},
			cartItems: [{quantity: 3, skuId: 21}],
		});

		renderSummary();

		expect(getRowValue('Net Price')).toBe('€ 120.00');
		expect(getRowValue('VAT')).toBe('€ 57.98');
		expect(getRowValue('Total')).toBe('€ 321.54');
	});

	it('shows the price of the first SKU when the cart has no items', () => {
		mockLayoutContext({cart: {summary: cartSummary}});

		renderSummary();

		expect(getRowValue('Net Price')).toBe('€ 88.58');
	});

	it('shows a zero price in every row when the product has no SKU and the cart has no summary', () => {
		mockLayoutContext({product: {...getProduct(), skus: []}});

		renderSummary();

		expect(getRowValue('Net Price')).toBe('€0.00');
		expect(getRowValue('VAT')).toBe('€0.00');
		expect(getRowValue('Total')).toBe('€0.00');
	});

	it('shows a zero price in the currency of the account when the cart has no summary', () => {
		mockLayoutContext({
			accountCurrencyCode: 'USD',
			product: {...getProduct(), skus: []},
		});

		renderSummary();

		expect(getRowValue('Net Price')).toBe('$0.00');
		expect(getRowValue('VAT')).toBe('$0.00');
		expect(getRowValue('Total')).toBe('$0.00');
	});

	it('shows a zero price in every row for a free app', () => {
		mockLayoutContext({
			cart: {summary: cartSummary},
			product: getProduct('free'),
		});

		renderSummary();

		expect(getRowValue('Net Price')).toBe('€0.00');
		expect(getRowValue('VAT')).toBe('€0.00');
		expect(getRowValue('Total')).toBe('€0.00');
	});
});
