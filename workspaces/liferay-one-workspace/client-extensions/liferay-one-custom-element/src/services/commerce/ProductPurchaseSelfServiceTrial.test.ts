/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminAccount from '~/services/headless/HeadlessCommerceAdminAccount';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Liferay} from '~/services/liferay/liferay';
import LicenseKeys from '~/services/spring-boot/LicenseKeys';

import ProductPurchaseSelfServiceTrial from './ProductPurchaseSelfServiceTrial';

import type {Account} from '~/types/accounts';
import type {Cart} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

import type {ActivationKeyFormData} from './ProductPurchaseDXPFree';

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

vi.mock('~/services/spring-boot/LicenseKeys', () => ({
	default: {createLicenseKeyTypeTrial: vi.fn()},
}));

const account = {id: 1} as Account;

const form = {
	businessEmailAddress: 'owner@example.com',
	domain: 'example.com',
} as ActivationKeyFormData;

function getCreatedCart() {
	return vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock
		.calls[0][1] as Cart;
}

function getProduct(solutionType: string) {
	return {
		id: 10,
		name: 'Trial',
		productId: 20,
		productSpecifications: [
			{specificationKey: 'solution-type', value: solutionType},
		],
		skus: [{id: 30}],
	} as unknown as DeliveryProduct;
}

describe('[CLIENT-COMMERCE-PRODUCTPURCHASESELFSERVICETRIAL] ProductPurchaseSelfServiceTrial', () => {
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
		vi.mocked(LicenseKeys.createLicenseKeyTypeTrial).mockResolvedValue(
			{} as never
		);
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};

		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('creates the CMP trial order, then the trial activation key', async () => {
		await expect(
			new ProductPurchaseSelfServiceTrial(
				account,
				getProduct('cmp-trial'),
				form
			).createOrder()
		).resolves.toEqual({id: 5});

		expect(getCreatedCart().orderTypeExternalReferenceCode).toBe(
			'CMP_TRIAL'
		);
		expect(LicenseKeys.createLicenseKeyTypeTrial).toHaveBeenCalledWith({
			domains: 'example.com',
			orderId: '5',
			owner: 'owner@example.com',
		});

		const [checkoutOrder] = vi.mocked(
			HeadlessCommerceDeliveryCart.checkoutCart
		).mock.invocationCallOrder;
		const [licenseKeyOrder] = vi.mocked(
			LicenseKeys.createLicenseKeyTypeTrial
		).mock.invocationCallOrder;

		expect(checkoutOrder).toBeLessThan(licenseKeyOrder);
	});

	it('creates the DSR trial order with its own order type', async () => {
		await new ProductPurchaseSelfServiceTrial(
			account,
			getProduct('dsr-trial'),
			form
		).createOrder();

		expect(getCreatedCart().orderTypeExternalReferenceCode).toBe(
			'DSR_TRIAL'
		);
	});

	it('links to purchase completed', async () => {
		await expect(
			new ProductPurchaseSelfServiceTrial(
				account,
				getProduct('cmp-trial'),
				form
			).getNextStepsLink({id: 5} as Cart)
		).resolves.toBe('/purchase-completed?orderId=5');
	});
});
