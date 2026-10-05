/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Liferay} from '~/services/liferay/liferay';
import DXPFreeActivationKeyRequests from '~/services/objects/DXPFreeActivationKeyRequests';
import LicenseKeys from '~/services/spring-boot/LicenseKeys';

import ProductPurchaseDXPFree, {
	ActivationKeyFormData,
} from './ProductPurchaseDXPFree';

import type {Account} from '~/types/accounts';
import type {Cart} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

vi.mock('~/services/headless/CommerceUI', () => ({
	default: {selectAccount: vi.fn()},
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

vi.mock('~/services/objects/DXPFreeActivationKeyRequests', () => ({
	default: {createDXPFreeActivationKeyRequest: vi.fn()},
}));

vi.mock('~/services/spring-boot/LicenseKeys', () => ({
	default: {createLicenseKeyTypeFree: vi.fn()},
}));

const account = {id: 1} as Account;

const form = {
	businessEmailAddress: 'owner@example.com',
	companyName: 'Acme',
	country: 'US',
	domain: 'example.com',
	extension: '12',
	fullName: 'Jane Doe',
	intlCode: {code: '+1'},
	jobTitle: 'Engineer',
	notifyMeAboutProducts: true,
	phoneNumber: '5555555',
	purpose: 'Testing',
} as ActivationKeyFormData;

const product = {
	id: 10,
	name: 'DXP Free',
	productId: 20,
	skus: [{id: 30}],
} as DeliveryProduct;

function getCreatedCart() {
	return vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock
		.calls[0][1] as Cart;
}

describe('[CLIENT-COMMERCE-PRODUCTPURCHASEDXPFREE] ProductPurchaseDXPFree', () => {
	const commerceContext = {...Liferay.CommerceContext};

	beforeEach(() => {
		Object.assign(Liferay.CommerceContext, {
			commerceChannelId: '99',
			currency: {currencyCode: 'USD'},
		});

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
		vi.mocked(LicenseKeys.createLicenseKeyTypeFree).mockResolvedValue(
			{} as never
		);
		vi.mocked(
			DXPFreeActivationKeyRequests.createDXPFreeActivationKeyRequest
		).mockResolvedValue({} as never);
	});

	it('creates the order, then the free license key, then the activation key request', async () => {
		await expect(
			new ProductPurchaseDXPFree(account, product, form).createOrder()
		).resolves.toEqual({id: 5});

		expect(getCreatedCart().orderTypeExternalReferenceCode).toBe('DXP');
		expect(LicenseKeys.createLicenseKeyTypeFree).toHaveBeenCalledWith({
			domains: 'example.com',
			orderId: '5',
			owner: 'owner@example.com',
		});
		expect(
			DXPFreeActivationKeyRequests.createDXPFreeActivationKeyRequest
		).toHaveBeenCalledWith({
			businessEmailAddress: 'owner@example.com',
			companyName: 'Acme',
			country: 'US',
			domain: 'example.com',
			extension: '12',
			fullName: 'Jane Doe',
			intlCode: '+1',
			jobTitle: 'Engineer',
			notifyMe: true,
			phoneNumber: '5555555',
			purpose: 'Testing',
			r_orderToDXPFreeActivationKeyRequest_commerceOrderId: '5',
		});

		const [checkoutOrder] = vi.mocked(
			HeadlessCommerceDeliveryCart.checkoutCart
		).mock.invocationCallOrder;
		const [licenseKeyOrder] = vi.mocked(
			LicenseKeys.createLicenseKeyTypeFree
		).mock.invocationCallOrder;
		const [requestOrder] = vi.mocked(
			DXPFreeActivationKeyRequests.createDXPFreeActivationKeyRequest
		).mock.invocationCallOrder;

		expect(checkoutOrder).toBeLessThan(licenseKeyOrder);
		expect(licenseKeyOrder).toBeLessThan(requestOrder);
	});

	it('links to purchase completed', async () => {
		await expect(
			new ProductPurchaseDXPFree(account, product, form).getNextStepsLink(
				{id: 5} as Cart
			)
		).resolves.toBe('/purchase-completed?orderId=5');
	});

	it('logs a failed activation key request without failing the order', async () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});
		const requestError = new Error('Unable to create');

		vi.mocked(
			DXPFreeActivationKeyRequests.createDXPFreeActivationKeyRequest
		).mockRejectedValue(requestError);

		await expect(
			new ProductPurchaseDXPFree(account, product, form).createOrder()
		).resolves.toEqual({id: 5});
		expect(consoleError).toHaveBeenCalledWith(requestError);
	});
});
