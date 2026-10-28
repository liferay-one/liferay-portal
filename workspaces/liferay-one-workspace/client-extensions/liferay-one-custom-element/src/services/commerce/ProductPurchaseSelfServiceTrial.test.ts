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
import CommerceOrders from '~/services/spring-boot/CommerceOrders';

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
	default: {generateActivationKey: vi.fn(), getGenerateForm: vi.fn()},
}));

vi.mock('~/services/spring-boot/CommerceOrders', () => ({
	default: {completeSettled: vi.fn()},
}));

vi.mock('~/services/liferay/Analytics', () => ({
	Analytics: {track: vi.fn()},
}));

vi.mock('~/utils/siteUtils', () => ({
	getSiteURL: () => '/web/one',
}));

const account = {externalReferenceCode: 'ACCNT-1', id: 1} as Account;

const PROJECT_LINK = `${window.location.origin}/web/one/my-account#/ACCNT-1/project/one-time-purchases`;

const TRIAL_GENERATE_FORM = {
	bundleProducts: [
		{
			availableCount: 0,
			entitlementId: 101,
			externalReferenceCode: 'PRDCT-OTHER-TRIAL',
			licensable: true,
		},
		{
			availableCount: 1,
			entitlementId: 102,
			externalReferenceCode: 'PRDCT-TRIAL',
			licensable: true,
		},
	],
	products: [
		{
			externalReferenceCode: 'PRDCT-DXP-TRIAL',
			keyTypes: [
				{
					key: 'non-production',
					subscriptions: [
						{availableCount: 0, entitlementId: 201},
						{availableCount: 1, entitlementId: 202},
					],
				},
			],
			versions: ['2026.q2', '2026.q1'],
		},
	],
};

const DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE = 'PRDCT-DXP-TRIAL';

const TRIAL_SERVER = {
	environmentName: ' E2E Trial ',
	serverField: 'ipAddresses',
	serverValue: '10.0.0.1\n10.0.0.2 ',
} as const;

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
		vi.mocked(CommerceOrders.completeSettled).mockResolvedValue();
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
				DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE,
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

	it('places the trial order when the checkout only reports a missing billing address', async () => {
		vi.mocked(HeadlessCommerceDeliveryCart.checkoutCart).mockResolvedValue({
			errorMessages: ['Invalid billing address'],
			valid: true,
		} as Cart);

		await expect(
			new ProductPurchaseSelfServiceTrial(
				account,
				DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE,
				getProduct('cmp-trial')
			).createOrder()
		).resolves.toEqual({id: 5});
	});

	it('fails the trial order on any other checkout error', async () => {
		vi.mocked(HeadlessCommerceDeliveryCart.checkoutCart).mockResolvedValue({
			errorMessages: ['Invalid billing address', 'Invalid price'],
			valid: true,
		} as Cart);

		await expect(
			new ProductPurchaseSelfServiceTrial(
				account,
				DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE,
				getProduct('cmp-trial')
			).createOrder()
		).rejects.toThrow('Invalid price');
	});

	it('places the DSR trial order with its own order type', async () => {
		await new ProductPurchaseSelfServiceTrial(
			account,
			DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE,
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
				DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE,
				getProduct('cmp-trial')
			).createOrder()
		).rejects.toThrow('Unable to find product PRDCT-DXP-TRIAL');

		expect(HeadlessCommerceDeliveryCart.createCart).not.toHaveBeenCalled();
	});

	it('fails when no DXP trial product is configured', () => {
		expect(
			() =>
				new ProductPurchaseSelfServiceTrial(
					account,
					'',
					getProduct('cmp-trial')
				)
		).toThrow(
			'Unable to start a trial without the DXP trial product external reference code'
		);
	});

	it('loads the DXP trial product once before the order is placed', async () => {
		const productPurchaseSelfServiceTrial =
			new ProductPurchaseSelfServiceTrial(
				account,
				DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE,
				getProduct('cmp-trial')
			);

		await productPurchaseSelfServiceTrial.loadDXPTrialProduct();
		await productPurchaseSelfServiceTrial.createOrder();

		expect(
			HeadlessCommerceDeliveryCatalog.getProductsPage
		).toHaveBeenCalledTimes(1);
	});

	it('generates the trial key from the server details once the trial entitlements exist and links to the project activation keys', async () => {
		vi.useFakeTimers();

		const openToastSpy = vi.spyOn(Liferay.Util, 'openToast');

		vi.mocked(ActivationKeys.generateActivationKey).mockResolvedValue({
			activationKeyId: 1,
			externalReferenceCode: 'KEY-1',
		});
		vi.mocked(ActivationKeys.getGenerateForm)
			.mockResolvedValueOnce({
				bundleProducts: [],
				products: [{externalReferenceCode: 'PRDCT-DXP-TRIAL'}],
			} as never)
			.mockResolvedValueOnce(TRIAL_GENERATE_FORM as never);

		const nextStepsLinkPromise = new ProductPurchaseSelfServiceTrial(
			account,
			DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE,
			getProduct('cmp-trial'),
			TRIAL_SERVER
		).getNextStepsLink({id: 5} as Cart);

		await vi.runAllTimersAsync();

		await expect(nextStepsLinkPromise).resolves.toBe(
			`${PROJECT_LINK}/activation`
		);

		expect(ActivationKeys.getGenerateForm).toHaveBeenCalledTimes(2);
		expect(ActivationKeys.getGenerateForm).toHaveBeenCalledWith({
			accountExternalReferenceCode: 'ACCNT-1',
		});
		expect(ActivationKeys.generateActivationKey).toHaveBeenCalledWith({
			accountExternalReferenceCode: 'ACCNT-1',
			bundleEntitlementIds: [102],
			environmentName: 'E2E Trial',
			keyType: 'non-production',
			servers: [
				{
					hostName: '',
					ipAddresses: '10.0.0.1\n10.0.0.2',
					macAddresses: '',
				},
			],
			subscriptionEntitlementId: 202,
			version: '2026.q2',
		});
		expect(CommerceOrders.completeSettled).toHaveBeenCalledWith(5);
		expect(openToastSpy).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	it('links to the activation key generator with a warning when the trial key cannot be generated', async () => {
		const openToastSpy = vi.spyOn(Liferay.Util, 'openToast');

		vi.mocked(ActivationKeys.generateActivationKey).mockRejectedValue(
			new Error('Unavailable')
		);
		vi.mocked(ActivationKeys.getGenerateForm).mockResolvedValue(
			TRIAL_GENERATE_FORM as never
		);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(
			new ProductPurchaseSelfServiceTrial(
				account,
				DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE,
				getProduct('cmp-trial'),
				TRIAL_SERVER
			).getNextStepsLink({id: 5} as Cart)
		).resolves.toBe(
			`${PROJECT_LINK}/activation/generate?new=PRDCT-DXP-TRIAL`
		);

		expect(openToastSpy).toHaveBeenCalledWith(
			expect.objectContaining({type: 'warning'})
		);
	});

	it('completes the settled order before it waits for the trial entitlements, and links to the activation key generator with a warning after the wait runs out', async () => {
		vi.useFakeTimers();

		const openToastSpy = vi.spyOn(Liferay.Util, 'openToast');

		vi.mocked(ActivationKeys.getGenerateForm).mockRejectedValue(
			new Error('Unavailable')
		);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const nextStepsLinkPromise = new ProductPurchaseSelfServiceTrial(
			account,
			DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE,
			getProduct('cmp-trial')
		).getNextStepsLink({id: 5} as Cart);

		await vi.runAllTimersAsync();

		await expect(nextStepsLinkPromise).resolves.toContain(
			'/activation/generate?new=PRDCT-DXP-TRIAL'
		);

		expect(ActivationKeys.getGenerateForm).toHaveBeenCalledTimes(10);
		expect(CommerceOrders.completeSettled).toHaveBeenCalledWith(5);
		expect(
			vi.mocked(CommerceOrders.completeSettled).mock
				.invocationCallOrder[0]
		).toBeLessThan(
			vi.mocked(ActivationKeys.getGenerateForm).mock
				.invocationCallOrder[0]
		);
		expect(openToastSpy).toHaveBeenCalledWith(
			expect.objectContaining({type: 'warning'})
		);

		vi.useRealTimers();
	});

	it('rejects a product that is not a self service trial', () => {
		expect(
			() =>
				new ProductPurchaseSelfServiceTrial(
					account,
					DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE,
					getProduct('cmp')
				)
		).toThrow('Unable to find the trial order type of product PRDCT-TRIAL');
	});

	it('finds an earlier trial order of the same type on the account', async () => {
		vi.mocked(HeadlessCommerceDeliveryOrder.getPlacedOrders)
			.mockResolvedValueOnce({items: [{id: 7}]} as never)
			.mockResolvedValueOnce({items: []} as never);

		const productPurchaseSelfServiceTrial =
			new ProductPurchaseSelfServiceTrial(
				account,
				DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE,
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
