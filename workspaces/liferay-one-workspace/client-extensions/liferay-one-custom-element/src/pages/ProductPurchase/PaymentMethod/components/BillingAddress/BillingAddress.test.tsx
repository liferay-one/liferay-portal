/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import useAccountAddresses from '~/pages/ProductPurchase/hooks/useAccountAddresses';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';

import BillingAddress from './BillingAddress';

import type {BillingAddress as BillingAddressType} from '~/types/orders';

vi.mock(
	'~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout',
	() => ({
		useProductPurchaseLayoutContext: vi.fn(),
	})
);

vi.mock('~/pages/ProductPurchase/hooks/useAccountAddresses', () => ({
	default: vi.fn(),
}));

vi.mock('~/pages/ProductPurchase/hooks/useCommerceRegions', () => ({
	default: () => ({data: {items: []}}),
}));

vi.mock('~/services/headless/HeadlessAdminUser', () => ({
	default: {
		updateAccount: vi.fn(),
	},
}));

vi.mock('../BillingAddressForm/BillingAddressForm', () => ({
	default: ({
		setBillingAddress,
		setShowNewAddressForm,
	}: {
		setBillingAddress: (billingAddress: {name: string}) => void;
		setShowNewAddressForm: (show: boolean) => void;
	}) => (
		<button
			onClick={() => {
				setShowNewAddressForm(true);

				setBillingAddress({name: ''});
			}}
		>
			New Address
		</button>
	),
}));

const italyAddress = {
	city: 'Rome',
	countryISOCode: 'IT',
	defaultBilling: true,
	id: 1,
	name: 'Italy Office',
	street1: 'Via Roma 1',
	type: 2,
	zip: '00100',
};

const shippingAddress = {
	city: 'Austin',
	countryISOCode: 'US',
	id: 3,
	name: 'Warehouse',
	street1: '1 Dock Street',
	type: 3,
	zip: '73301',
};

const unitedStatesAddress = {
	city: 'Austin',
	countryISOCode: 'US',
	id: 2,
	name: 'Austin Office',
	street1: '2 Main Street',
	type: 1,
	zip: '73301',
};

let setPayment: ReturnType<typeof vi.fn>;
let updateBillingAddress: ReturnType<typeof vi.fn>;

function mockAddresses(addresses: BillingAddressType[]) {
	vi.mocked(useAccountAddresses).mockReturnValue({
		data: {items: addresses},
		mutate: vi.fn(),
	} as unknown as ReturnType<typeof useAccountAddresses>);
}

function mockLayoutContext({
	billingAddress = {},
	defaultBillingAddressId,
}: {
	billingAddress?: BillingAddressType;
	defaultBillingAddressId?: number;
} = {}) {
	const productPurchaseCart = {
		cart: {id: 9},
		updateBillingAddress,
	};

	vi.mocked(useProductPurchaseLayoutContext).mockReturnValue({
		payment: {billingAddress},
		productPurchaseCart,
		selectedAccount: {defaultBillingAddressId, id: 7},
		setPayment,
	} as unknown as ReturnType<typeof useProductPurchaseLayoutContext>);
}

function getPayment() {
	const updater = setPayment.mock.calls.at(-1)?.[0];

	return updater({});
}

function getSelectedBillingAddress() {
	return getPayment().billingAddress;
}

describe('[ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD] BillingAddress', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		setPayment = vi.fn();
		updateBillingAddress = vi.fn().mockResolvedValue(undefined);

		vi.mocked(HeadlessAdminUser.updateAccount).mockResolvedValue(
			undefined as never
		);
	});

	it('lists only the billing addresses of the account', () => {
		mockAddresses([italyAddress, shippingAddress, unitedStatesAddress]);
		mockLayoutContext();

		render(<BillingAddress />);

		expect(screen.getByText('Italy Office')).toBeTruthy();
		expect(screen.getByText('Austin Office')).toBeTruthy();
		expect(screen.queryByText('Warehouse')).toBeNull();
	});

	it('selects the default billing address and puts it on the cart', async () => {
		mockAddresses([unitedStatesAddress, italyAddress]);
		mockLayoutContext();

		render(<BillingAddress />);

		await waitFor(() =>
			expect(updateBillingAddress).toHaveBeenCalledWith(1)
		);

		expect(getSelectedBillingAddress()).toMatchObject({
			countryISOCode: 'IT',
			id: 1,
			name: 'Italy Office',
		});
		expect(getPayment().defaultBillingAddressId).toBe(1);
	});

	it('selects the address that the account names as its default billing address', async () => {
		mockAddresses([
			unitedStatesAddress,
			{...italyAddress, defaultBilling: false},
		]);
		mockLayoutContext({defaultBillingAddressId: 2});

		render(<BillingAddress />);

		await waitFor(() =>
			expect(updateBillingAddress).toHaveBeenCalledWith(2)
		);
	});

	it('selects the first address without making it the default when the account has no default billing address and the form is hidden', async () => {
		mockAddresses([
			unitedStatesAddress,
			{...italyAddress, defaultBilling: false},
		]);
		mockLayoutContext();

		render(<BillingAddress hideNewAddressButton />);

		await waitFor(() =>
			expect(updateBillingAddress).toHaveBeenCalledWith(2)
		);

		expect(getPayment().defaultBillingAddressId).toBeUndefined();
	});

	it('does not select the default billing address while the new address form is open', async () => {
		mockAddresses([]);
		mockLayoutContext();

		const {rerender} = render(<BillingAddress />);

		fireEvent.click(screen.getByText('New Address'));

		setPayment.mockClear();

		mockAddresses([unitedStatesAddress, italyAddress]);

		rerender(<BillingAddress />);

		await Promise.resolve();

		expect(setPayment).not.toHaveBeenCalled();
		expect(updateBillingAddress).not.toHaveBeenCalled();
	});

	it('selects no address when the account has no default billing address', () => {
		mockAddresses([
			unitedStatesAddress,
			{...italyAddress, defaultBilling: false},
		]);
		mockLayoutContext();

		render(<BillingAddress />);

		expect(setPayment).not.toHaveBeenCalled();
		expect(updateBillingAddress).not.toHaveBeenCalled();
	});

	it('puts the address that the user selects on the cart', async () => {
		mockAddresses([italyAddress, unitedStatesAddress]);
		mockLayoutContext({billingAddress: italyAddress});

		render(<BillingAddress />);

		fireEvent.click(screen.getByText('Austin Office'));

		await waitFor(() =>
			expect(updateBillingAddress).toHaveBeenCalledWith(2)
		);

		expect(getSelectedBillingAddress()).toMatchObject({
			countryISOCode: 'US',
			id: 2,
		});
		expect(getPayment()).not.toHaveProperty('defaultBillingAddressId');
	});
});
