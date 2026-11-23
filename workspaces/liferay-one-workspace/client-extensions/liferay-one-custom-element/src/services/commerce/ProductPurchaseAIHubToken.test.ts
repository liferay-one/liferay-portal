/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminAccount from '~/services/headless/HeadlessCommerceAdminAccount';
import HeadlessCommerceDeliveryCart from '~/services/headless/HeadlessCommerceDeliveryCart';
import {Liferay} from '~/services/liferay/liferay';
import Environments from '~/services/objects/Environments';

import {ProductPurchaseAIHubToken} from './ProductPurchaseAIHubToken';

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

vi.mock('~/services/liferay/Analytics', () => ({
	Analytics: {track: vi.fn()},
}));

vi.mock('~/services/objects/Environments', () => ({
	default: {getEnvironments: vi.fn()},
}));

const account = {externalReferenceCode: 'ACCNT-1', id: 1} as Account;

const product = {
	id: 10,
	name: 'AI Hub',
	productId: 20,
	skus: [{id: 30}],
} as DeliveryProduct;

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

		vi.mocked(
			HeadlessCommerceAdminAccount.getAccountAddresses
		).mockResolvedValue({items: []} as never);
		vi.mocked(HeadlessCommerceDeliveryCart.checkoutCart).mockResolvedValue({
			valid: true,
		} as Cart);
		vi.mocked(HeadlessCommerceDeliveryCart.createCart).mockResolvedValue({
			id: 5,
		} as Cart);
		vi.mocked(Environments.getEnvironments).mockResolvedValue({
			items: [
				{
					externalEnvironmentId: '444',
					externalReferenceCode: 'AI-HUB-PRJCT-1',
					id: 7,
					r_contractToEnvironment_c_contractERC: 'CONTRACT-1',
					r_contractToEnvironment_c_contractId: 3,
				},
			],
		} as never);
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};

		vi.clearAllMocks();
	});

	it('asks for the one AI Hub environment of the project and the account', async () => {
		await new ProductPurchaseAIHubToken(
			account,
			product,
			'PRJCT-1'
		).createOrder({} as Cart);

		const [searchParams] = vi.mocked(Environments.getEnvironments).mock
			.calls[0];

		expect(Object.fromEntries(searchParams as URLSearchParams)).toEqual({
			filter: "externalReferenceCode eq 'AI-HUB-PRJCT-1' and r_accountEntryToEnvironment_accountEntryId eq '1'",
			pageSize: '1',
		});
	});

	it('asks for the AI Hub environment of the account when no project is given', async () => {
		await new ProductPurchaseAIHubToken(account, product).createOrder(
			{} as Cart
		);

		const [searchParams] = vi.mocked(Environments.getEnvironments).mock
			.calls[0];

		expect((searchParams as URLSearchParams).get('filter')).toBe(
			"externalReferenceCode eq 'AI-HUB-ACCNT-1' and r_accountEntryToEnvironment_accountEntryId eq '1'"
		);
		expect(getOrderMetadata()).toEqual({
			contractEntityId: 3,
			salesforceContractId: 'CONTRACT-1',
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

	it('takes the project from the purchase and the contract from the AI Hub environment', async () => {
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

	it('buys tokens for an AI Hub environment that has no contract', async () => {
		vi.mocked(Environments.getEnvironments).mockResolvedValue({
			items: [
				{
					externalEnvironmentId: '444',
					externalReferenceCode: 'AI-HUB-PRJCT-1',
					id: 7,
				},
			],
		} as never);

		await new ProductPurchaseAIHubToken(
			account,
			product,
			'PRJCT-1'
		).createOrder({} as Cart);

		expect(getOrderMetadata()).toEqual({salesforceProjectId: 'PRJCT-1'});
	});

	it('doubles a quote of the project so that it stays inside the filter value', async () => {
		await expect(
			new ProductPurchaseAIHubToken(
				account,
				product,
				"X' or id gt '0"
			).createOrder({} as Cart)
		).resolves.toBeDefined();

		const [searchParams] = vi.mocked(Environments.getEnvironments).mock
			.calls[0];

		expect((searchParams as URLSearchParams).get('filter')).toBe(
			"externalReferenceCode eq 'AI-HUB-X'' or id gt ''0' and r_accountEntryToEnvironment_accountEntryId eq '1'"
		);
	});

	it('throws when the AI Hub environment was never provisioned', async () => {
		vi.mocked(Environments.getEnvironments).mockResolvedValue({
			items: [{externalReferenceCode: 'AI-HUB-PRJCT-1', id: 7}],
		} as never);

		await expect(
			new ProductPurchaseAIHubToken(
				account,
				product,
				'PRJCT-1'
			).createOrder({} as Cart)
		).rejects.toThrow(
			'No provisioned AI Hub environment AI-HUB-PRJCT-1 exists for account 1'
		);
		expect(HeadlessCommerceDeliveryCart.createCart).not.toHaveBeenCalled();
	});

	it('throws when neither a project nor an account external reference code is known', async () => {
		await expect(
			new ProductPurchaseAIHubToken(
				{id: 1} as Account,
				product
			).createOrder({} as Cart)
		).rejects.toThrow(
			'Unable to resolve the AI Hub environment of account 1'
		);
		expect(Environments.getEnvironments).not.toHaveBeenCalled();
	});

	it('throws when the project has no AI Hub environment', async () => {
		vi.mocked(Environments.getEnvironments).mockResolvedValue({
			items: [],
		} as never);

		await expect(
			new ProductPurchaseAIHubToken(
				account,
				product,
				'PRJCT-3'
			).createOrder({} as Cart)
		).rejects.toThrow(
			'No provisioned AI Hub environment AI-HUB-PRJCT-3 exists for account 1'
		);
		expect(HeadlessCommerceDeliveryCart.createCart).not.toHaveBeenCalled();
	});
});
