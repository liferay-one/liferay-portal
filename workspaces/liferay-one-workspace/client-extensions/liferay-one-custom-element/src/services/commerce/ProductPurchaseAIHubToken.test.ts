/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import {Liferay} from '~/services/liferay/liferay';

import {ProductPurchaseAIHubToken} from './ProductPurchaseAIHubToken';

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

vi.mock('~/services/headless/HeadlessCommerceDeliveryOrder', () => ({
	default: {getPlacedOrders: vi.fn()},
}));

const account = {id: 1} as Account;

const product = {
	id: 10,
	name: 'AI Hub Token',
	productId: 20,
	skus: [{id: 30}],
} as DeliveryProduct;

function aiHubOrder(
	code: number,
	label: string,
	metadata: Record<string, unknown>
) {
	return {
		customFields: {'order-metadata': JSON.stringify(metadata)},
		orderStatusInfo: {code, label},
		orderTypeExternalReferenceCode: 'AI_HUB',
	};
}

function getOrderMetadata() {
	const cart = vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock
		.calls[0][1] as Cart;

	return JSON.parse(cart.customFields['order-metadata'] as string);
}

describe('[CLIENT-COMMERCE-PRODUCTPURCHASEAIHUBTOKEN] ProductPurchaseAIHubToken', () => {
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
	});

	beforeEach(() => {
		vi.mocked(
			HeadlessCommerceDeliveryOrder.getPlacedOrders
		).mockResolvedValue({
			items: [
				aiHubOrder(1, 'Pending', {
					contractEntityId: 1,
					salesforceContractId: 'CONTRACT-PENDING',
					salesforceProjectId: 'PRJCT-1',
				}),
				aiHubOrder(0, 'Completed', {
					contractEntityId: 2,
					salesforceContractId: 'CONTRACT-2',
					salesforceProjectId: 'PRJCT-2',
				}),
				aiHubOrder(0, 'Completed', {
					contractEntityId: 3,
					salesforceContractId: 'CONTRACT-1',
					salesforceProjectId: 'PRJCT-1',
				}),
			],
		} as never);
	});

	it('queries the placed AI_HUB orders with the filter and sort', async () => {
		await new ProductPurchaseAIHubToken(account, product).createOrder(
			{} as Cart
		);

		const [channelId, accountId, searchParams] = vi.mocked(
			HeadlessCommerceDeliveryOrder.getPlacedOrders
		).mock.calls[0];

		expect(channelId).toBe('99');
		expect(accountId).toBe(1);
		expect(Object.fromEntries(searchParams as URLSearchParams)).toEqual({
			filter: "orderTypeExternalReferenceCode eq 'AI_HUB'",
			nestedFields: 'customFields',
			pageSize: '100',
			sort: 'createDate:desc',
		});
	});

	it('resolves next steps through the payment URL', async () => {
		vi.mocked(
			HeadlessCommerceDeliveryCart.getPaymentMethodURL
		).mockResolvedValue('https://pay.example.com');

		await expect(
			new ProductPurchaseAIHubToken(account, product).getNextStepsLink({
				id: 5,
			} as Cart)
		).resolves.toBe('https://pay.example.com');
	});

	it('takes the contract metadata from the completed order matching the project ERC', async () => {
		await new ProductPurchaseAIHubToken(
			account,
			product,
			'PRJCT-1'
		).createOrder({} as Cart);

		expect(getOrderMetadata()).toEqual({
			contractEntityId: 3,
			salesforceContractId: 'CONTRACT-1',
			salesforceProjectId: 'PRJCT-1',
		});
		expect(
			vi.mocked(HeadlessCommerceDeliveryCart.createCart).mock.calls[0][1]
		).toMatchObject({orderTypeExternalReferenceCode: 'AI_HUB_TOKEN'});
	});

	it('throws when no completed order matches the project', async () => {
		await expect(
			new ProductPurchaseAIHubToken(
				account,
				product,
				'PRJCT-3'
			).createOrder({} as Cart)
		).rejects.toThrow('No AI Hub order exists for project PRJCT-3');
		expect(HeadlessCommerceDeliveryCart.createCart).not.toHaveBeenCalled();
	});

	it('uses the first completed order when no project is given', async () => {
		await new ProductPurchaseAIHubToken(account, product).createOrder(
			{} as Cart
		);

		expect(getOrderMetadata()).toEqual({
			contractEntityId: 2,
			salesforceContractId: 'CONTRACT-2',
			salesforceProjectId: 'PRJCT-2',
		});
	});
});
