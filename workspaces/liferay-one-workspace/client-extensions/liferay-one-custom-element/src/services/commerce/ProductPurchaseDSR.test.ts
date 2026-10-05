/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Liferay} from '~/services/liferay/liferay';
import DSRRequests from '~/services/objects/DSRRequests';
import DigitalSalesRoom from '~/services/spring-boot/DigitalSalesRoom';

import ProductPurchaseDSR, {DSRFormData} from './ProductPurchaseDSR';

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

vi.mock('~/services/objects/DSRRequests', () => ({
	default: {createDSRRequest: vi.fn()},
}));

vi.mock('~/services/spring-boot/DigitalSalesRoom', () => ({
	default: {provisioningOrder: vi.fn()},
}));

const account = {externalReferenceCode: 'ACCNT-1', id: 1} as Account;

const form = {
	acceptTermsAndConditions: true,
	dataCenterLocation: 'us-east',
	hostname: '  host.example.com  ',
	ipAddress: ' 10.0.0.1 \n\n10.0.0.2\n',
	macAddress: 'AA:BB\n CC:DD ',
	workspaceName: '  Workspace  ',
	workspaceOwnerEmail: ' owner@example.com ',
} as DSRFormData;

const product = {
	id: 10,
	name: 'DSR',
	productId: 20,
	skus: [{id: 30}],
} as DeliveryProduct;

const settings = {
	dataCenterLocation: 'us-east',
	hostName: 'host.example.com',
	ipAddresses: '10.0.0.1,10.0.0.2',
	macAddresses: 'AA:BB,CC:DD',
	workspaceName: 'Workspace',
	workspaceOwnerEmail: 'owner@example.com',
};

function getCreatedCart() {
	return vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock
		.calls[0][1] as Cart;
}

describe('[CLIENT-COMMERCE-PRODUCTPURCHASEDSR] ProductPurchaseDSR', () => {
	const commerceContext = {...Liferay.CommerceContext};
	const themeDisplay = Liferay.ThemeDisplay;

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
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	beforeEach(() => {
		vi.mocked(DSRRequests.createDSRRequest).mockResolvedValue({} as never);
		vi.mocked(DigitalSalesRoom.provisioningOrder).mockResolvedValue();
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};
		Liferay.ThemeDisplay = themeDisplay;
	});

	it('creates the order, then posts the DSR request, then provisions the Digital Sales Room', async () => {
		await expect(
			new ProductPurchaseDSR(account, product, form).createOrder()
		).resolves.toEqual({id: 5});

		const cart = getCreatedCart();

		expect(cart.customFields).toEqual({
			dsrSettings: JSON.stringify(settings),
		});
		expect(cart.orderTypeExternalReferenceCode).toBe('DSR');
		expect(DSRRequests.createDSRRequest).toHaveBeenCalledWith({
			...settings,
			acceptTermsAndConditions: true,
			corpProjectName: 'Workspace',
			corpProjectUuid: 'ACCNT-1',
			incidentReportEmailAddresses: 'owner@example.com',
			name: 'Workspace',
			ownerEmailAddress: 'owner@example.com',
			r_orderToDSRRequest_commerceOrderId: '5',
			serverLocation: 'us-east',
		});
		expect(DigitalSalesRoom.provisioningOrder).toHaveBeenCalledWith(5);

		const [checkoutOrder] = vi.mocked(
			HeadlessCommerceDeliveryCart.checkoutCart
		).mock.invocationCallOrder;
		const [requestOrder] = vi.mocked(DSRRequests.createDSRRequest).mock
			.invocationCallOrder;
		const [provisioningOrder] = vi.mocked(
			DigitalSalesRoom.provisioningOrder
		).mock.invocationCallOrder;

		expect(checkoutOrder).toBeLessThan(requestOrder);
		expect(requestOrder).toBeLessThan(provisioningOrder);
	});

	it('falls back to the signed in user email when the workspace owner email is blank', async () => {
		Liferay.ThemeDisplay = new Proxy(themeDisplay, {
			get: (target, property) =>
				property === 'getUserEmailAddress'
					? () => 'signed.in@example.com'
					: Reflect.get(target, property),
		});

		await new ProductPurchaseDSR(account, product, {
			...form,
			workspaceOwnerEmail: '   ',
		}).createOrder();

		expect(
			JSON.parse(getCreatedCart().customFields.dsrSettings as string)
		).toMatchObject({workspaceOwnerEmail: 'signed.in@example.com'});
	});

	it('logs a failed DSR request and still provisions', async () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});
		const requestError = new Error('Unable to create');

		vi.mocked(DSRRequests.createDSRRequest).mockRejectedValue(requestError);

		await expect(
			new ProductPurchaseDSR(account, product, form).createOrder()
		).resolves.toEqual({id: 5});
		expect(consoleError).toHaveBeenCalledWith(requestError);
		expect(DigitalSalesRoom.provisioningOrder).toHaveBeenCalledWith(5);
	});
});
