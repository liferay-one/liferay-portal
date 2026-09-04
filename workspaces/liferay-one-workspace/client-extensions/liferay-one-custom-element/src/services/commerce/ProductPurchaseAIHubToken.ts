/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import {Liferay} from '~/services/liferay/liferay';
import SearchBuilder from '~/utils/SearchBuilder';
import {OrderCustomFields} from '~/utils/orderUtils';
import {safeJSONParse} from '~/utils/safeJSONParse';

import ProductPurchase from './ProductPurchase';

import type {Cart, OrderTypes} from '~/types/orders';

type AIHubOrderMetadata = {
	contractEntityId?: number;
	salesforceContractId?: string;
	salesforceProjectId?: string;
};

export class ProductPurchaseAIHubToken extends ProductPurchase {
	private aiHubOrderMetadata: AIHubOrderMetadata = {};
	protected orderTypeExternalReferenceCode: OrderTypes = 'AI_HUB_TOKEN';

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
		const response = await HeadlessCommerceDeliveryOrder.getPlacedOrders(
			Liferay.CommerceContext.commerceChannelId,
			this.account?.id,
			new URLSearchParams({
				filter: SearchBuilder.eq(
					'orderTypeExternalReferenceCode',
					'AI_HUB'
				),
				nestedFields: 'customFields',
				pageSize: '1',
				sort: 'createDate:desc',
			})
		);

		const aiHubOrder = response?.items?.[0];

		const orderMetadata = safeJSONParse<AIHubOrderMetadata>(
			aiHubOrder?.customFields?.[
				OrderCustomFields.ORDER_METADATA
			] as string,
			{}
		);

		this.aiHubOrderMetadata = {
			contractEntityId: orderMetadata.contractEntityId,
			salesforceContractId: orderMetadata.salesforceContractId,
			salesforceProjectId: orderMetadata.salesforceProjectId,
		};
	}
}
