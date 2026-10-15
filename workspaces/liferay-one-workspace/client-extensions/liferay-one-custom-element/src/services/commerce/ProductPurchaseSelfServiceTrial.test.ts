/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminAccount from '~/services/headless/HeadlessCommerceAdminAccount';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import {Liferay} from '~/services/liferay/liferay';
import ActivationKeys from '~/services/spring-boot/ActivationKeys';

import ProductPurchaseSelfServiceTrial from './ProductPurchaseSelfServiceTrial';

import type {Account} from '~/types/accounts';
import type {Cart} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

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

vi.mock('~/services/headless/HeadlessCommerceDeliveryCatalog', () => ({
	default: {getProductsPage: vi.fn()},
}));

vi.mock('~/services/headless/HeadlessCommerceDeliveryOrder', () => ({
	default: {getPlacedOrders: vi.fn()},
}));

vi.mock('~/services/spring-boot/ActivationKeys', () => ({
	default: {getGenerateForm: vi.fn()},
}));

vi.mock('~/services/liferay/Analytics', () => ({
	Analytics: {track: vi.fn()},
}));

vi.mock('~/utils/siteUtils', () => ({
	getSiteURL: () => '/web/one',
}));

const account = {externalReferenceCode: 'ACCNT-1', id: 1} as Account;

function getCreatedCart() {
	return vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock
		.calls[0][1] as Cart;
}

function getProduct(solutionType: string) {
	return {
		externalReferenceCode: 'PRDCT-TRIAL',
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
		vi.mocked(
			HeadlessCommerceDeliveryCatalog.getProductsPage
		).mockResolvedValue({
			items: [{id: 40, productId: 50, skus: [{id: 60}]}],
		} as never);
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};

		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('places one CMP trial order with the trial SKU and the DXP trial SKU', async () => {
		await expect(
			new ProductPurchaseSelfServiceTrial(
				account,
				getProduct('cmp-trial')
			).createOrder()
		).resolves.toEqual({id: 5});

		const cart = getCreatedCart();

		expect(cart.orderTypeExternalReferenceCode).toBe('CMP_TRIAL');
		expect(
			cart.cartItems?.map(({productId, skuId}) => ({productId, skuId}))
		).toEqual([
			{productId: 20, skuId: 30},
			{productId: 50, skuId: 60},
		]);

		const [, searchParams] = vi.mocked(
			HeadlessCommerceDeliveryCatalog.getProductsPage
		).mock.calls[0];

		expect(searchParams?.get('filter')).toBe(
			"externalReferenceCode eq 'PRDCT-DXP-TRIAL'"
		);
	});

	it('places the DSR trial order with its own order type', async () => {
		await new ProductPurchaseSelfServiceTrial(
			account,
			getProduct('dsr-trial')
		).createOrder();

		expect(getCreatedCart().orderTypeExternalReferenceCode).toBe(
			'DSR_TRIAL'
		);
	});

	it('creates no cart when the DXP trial product is missing', async () => {
		vi.mocked(
			HeadlessCommerceDeliveryCatalog.getProductsPage
		).mockResolvedValue({items: []} as never);

		await expect(
			new ProductPurchaseSelfServiceTrial(
				account,
				getProduct('cmp-trial')
			).createOrder()
		).rejects.toThrow('Unable to find product PRDCT-DXP-TRIAL');

		expect(HeadlessCommerceDeliveryCart.createCart).not.toHaveBeenCalled();
	});

	it('loads the DXP trial product once before the order is placed', async () => {
		const productPurchaseSelfServiceTrial =
			new ProductPurchaseSelfServiceTrial(
				account,
				getProduct('cmp-trial')
			);

		await productPurchaseSelfServiceTrial.loadDXPTrialProduct();
		await productPurchaseSelfServiceTrial.createOrder();

		expect(
			HeadlessCommerceDeliveryCatalog.getProductsPage
		).toHaveBeenCalledTimes(1);
	});

	it('links to the activation key generator once the trial entitlements exist', async () => {
		vi.useFakeTimers();

		const openToastSpy = vi.spyOn(Liferay.Util, 'openToast');

		vi.mocked(ActivationKeys.getGenerateForm)
			.mockResolvedValueOnce({
				bundleProducts: [],
				products: [{externalReferenceCode: 'PRDCT-DXP-TRIAL'}],
			} as never)
			.mockResolvedValueOnce({
				bundleProducts: [{externalReferenceCode: 'PRDCT-TRIAL'}],
				products: [{externalReferenceCode: 'PRDCT-DXP-TRIAL'}],
			} as never);

		const nextStepsLinkPromise = new ProductPurchaseSelfServiceTrial(
			account,
			getProduct('cmp-trial')
		).getNextStepsLink();

		await vi.runAllTimersAsync();

		await expect(nextStepsLinkPromise).resolves.toBe(
			`${window.location.origin}/web/one/my-account#/ACCNT-1/project/one-time-purchases/activation/generate?new=PRDCT-DXP-TRIAL`
		);

		expect(ActivationKeys.getGenerateForm).toHaveBeenCalledTimes(2);
		expect(ActivationKeys.getGenerateForm).toHaveBeenCalledWith({
			accountExternalReferenceCode: 'ACCNT-1',
		});
		expect(openToastSpy).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	it('links to the activation key generator with a warning after the wait for the trial entitlements runs out', async () => {
		vi.useFakeTimers();

		const openToastSpy = vi.spyOn(Liferay.Util, 'openToast');

		vi.mocked(ActivationKeys.getGenerateForm).mockRejectedValue(
			new Error('Unavailable')
		);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const nextStepsLinkPromise = new ProductPurchaseSelfServiceTrial(
			account,
			getProduct('cmp-trial')
		).getNextStepsLink();

		await vi.runAllTimersAsync();

		await expect(nextStepsLinkPromise).resolves.toContain(
			'/activation/generate?new=PRDCT-DXP-TRIAL'
		);

		expect(ActivationKeys.getGenerateForm).toHaveBeenCalledTimes(10);
		expect(openToastSpy).toHaveBeenCalledWith(
			expect.objectContaining({type: 'warning'})
		);

		vi.useRealTimers();
	});

	it('rejects a product that is not a self service trial', () => {
		expect(
			() =>
				new ProductPurchaseSelfServiceTrial(account, getProduct('cmp'))
		).toThrow('Unable to find the trial order type of product PRDCT-TRIAL');
	});

	it('finds an earlier trial order of the same type on the account', async () => {
		vi.mocked(HeadlessCommerceDeliveryOrder.getPlacedOrders)
			.mockResolvedValueOnce({items: [{id: 7}]} as never)
			.mockResolvedValueOnce({items: []} as never);

		const productPurchaseSelfServiceTrial =
			new ProductPurchaseSelfServiceTrial(
				account,
				getProduct('dsr-trial')
			);

		await expect(
			productPurchaseSelfServiceTrial.hasTrialOrder()
		).resolves.toBe(true);
		await expect(
			productPurchaseSelfServiceTrial.hasTrialOrder()
		).resolves.toBe(false);

		const [channelId, accountId, searchParams] = vi.mocked(
			HeadlessCommerceDeliveryOrder.getPlacedOrders
		).mock.calls[0];

		expect(channelId).toBe('99');
		expect(accountId).toBe(1);
		expect(searchParams?.get('filter')).toBe(
			"orderTypeExternalReferenceCode eq 'DSR_TRIAL'"
		);
	});
});
