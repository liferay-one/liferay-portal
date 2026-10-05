/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Liferay} from '~/services/liferay/liferay';
import LiferayDataPlatform from '~/services/spring-boot/LiferayDataPlatform';

import ProductPurchaseLDP, {LDPSettings} from './ProductPurchaseLDP';

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

vi.mock('~/services/spring-boot/LiferayDataPlatform', () => ({
	default: {postProvisioningOrder: vi.fn()},
}));

const account = {id: 1} as Account;

const ldpSettings: LDPSettings = {
	allowedEmailDomains: ['example.com'],
	dataCenterLocation: 'us-east',
	incidentReportContacts: ['ops@example.com'],
	workspaceName: 'Workspace',
	workspaceOwnerEmail: 'owner@example.com',
};

const product = {
	id: 10,
	name: 'LDP',
	productId: 20,
	skus: [{id: 30}],
} as DeliveryProduct;

function getCreatedCart() {
	return vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock
		.calls[0][1] as Cart;
}

describe('[CLIENT-COMMERCE-PRODUCTPURCHASELDP] ProductPurchaseLDP', () => {
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

	it('logs a failed provisioning and still returns the order', async () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});
		const provisioningError = new Error('Unable to provision');

		vi.mocked(LiferayDataPlatform.postProvisioningOrder).mockRejectedValue(
			provisioningError
		);

		await expect(
			new ProductPurchaseLDP(account, product, ldpSettings).createOrder()
		).resolves.toEqual({id: 5});

		await vi.waitFor(() => {
			expect(consoleError).toHaveBeenCalledWith(provisioningError);
		});
	});

	it('serializes the LDP settings into the cart and fires provisioning without awaiting it', async () => {
		vi.mocked(LiferayDataPlatform.postProvisioningOrder).mockReturnValue(
			new Promise(() => {})
		);

		await expect(
			new ProductPurchaseLDP(account, product, ldpSettings).createOrder({
				customFields: {existing: 'value'} as Cart['customFields'],
			} as Cart)
		).resolves.toEqual({id: 5});

		const cart = getCreatedCart();

		expect(cart.customFields).toEqual({
			existing: 'value',
			ldpSettings: JSON.stringify(ldpSettings),
		});
		expect(cart.orderTypeExternalReferenceCode).toBe('LDP');
		expect(LiferayDataPlatform.postProvisioningOrder).toHaveBeenCalledWith(
			5
		);
	});
});
