/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import SearchBuilder from '~/services/fetcher/SearchBuilder';
import Environments from '~/services/objects/Environments';
import {
	getAIHubEnvironmentExternalReferenceCode,
	isProvisionedAIHubEnvironment,
} from '~/utils/aiHubEnvironmentUtils';
import {escapeODataString} from '~/utils/escapeODataString';
import {OrderCustomFields} from '~/utils/orderUtils';

import ProductPurchase from './ProductPurchase';

import type {Account} from '~/types/accounts';
import type {Cart, OrderTypes} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

type AIHubOrderMetadata = {
	contractEntityId?: number;
	salesforceContractId?: string;
	salesforceProjectId?: string;
};

export class ProductPurchaseAIHubToken extends ProductPurchase {
	private aiHubOrderMetadata: AIHubOrderMetadata = {};
	protected orderTypeExternalReferenceCode: OrderTypes = 'AI_HUB_TOKEN';

	constructor(
		account: Account,
		product: DeliveryProduct,
		private readonly projectExternalReferenceCode?: string | null
	) {
		super(account, product);
	}

	protected getCart() {
		const baseCart = super.getCart();
		const cartItems = super.getCartItems();

		return {
			...baseCart,
			cartItems,
			customFields: {
				...baseCart?.customFields,
				[OrderCustomFields.ORDER_METADATA]: JSON.stringify({
					contractEntityId: this.aiHubOrderMetadata.contractEntityId,
					salesforceContractId:
						this.aiHubOrderMetadata.salesforceContractId,
					salesforceProjectId:
						this.aiHubOrderMetadata.salesforceProjectId,
				}),
			},
			orderTypeExternalReferenceCode: this.orderTypeExternalReferenceCode,
		} as Cart;
	}

	public get calculateTax() {
		return false;
	}

	public async createOrder(cart: Cart) {
		await this.resolveAIHubOrderMetadata();

		const serviceCart = this.getCart();

		return super.createOrder({
			...serviceCart,
			...cart,
			customFields: serviceCart.customFields,
		});
	}

	public async getNextStepsLink(cart: Cart) {
		return super.getPaymentNextStepsLink(cart);
	}

	private async resolveAIHubOrderMetadata() {
		const ownerExternalReferenceCode =
			this.projectExternalReferenceCode ||
			this.account.externalReferenceCode;

		if (!ownerExternalReferenceCode) {
			throw new Error(
				`Unable to resolve the AI Hub environment of account ${this.account.id}`
			);
		}

		const environmentExternalReferenceCode =
			getAIHubEnvironmentExternalReferenceCode(
				ownerExternalReferenceCode
			);

		const response = await Environments.getEnvironments(
			new URLSearchParams({
				filter: new SearchBuilder()
					.eq(
						'externalReferenceCode',
						escapeODataString(environmentExternalReferenceCode)
					)
					.and()
					.eq(
						'r_accountEntryToEnvironment_accountEntryId',
						this.account.id
					)
					.build(),
				pageSize: '1',
			})
		);

		const environment = response?.items?.[0];

		if (!isProvisionedAIHubEnvironment(environment)) {
			throw new Error(
				`No provisioned AI Hub environment ${environmentExternalReferenceCode} exists for account ${this.account.id}`
			);
		}

		this.aiHubOrderMetadata = {
			contractEntityId:
				environment.r_contractToEnvironment_c_contractId || undefined,
			salesforceContractId:
				environment.r_contractToEnvironment_c_contractERC || undefined,
			salesforceProjectId: this.projectExternalReferenceCode || undefined,
		};
	}
}
