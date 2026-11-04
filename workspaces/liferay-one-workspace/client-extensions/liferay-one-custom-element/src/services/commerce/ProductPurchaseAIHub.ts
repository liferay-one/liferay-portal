/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {z} from 'zod';
import {adminSchemas as zodSchema} from '~/schemas/adminSchemas';
import {OrderCustomFields} from '~/utils/orderUtils';

import ProductPurchase, {
	INVALID_BILLING_ADDRESS_ERROR_MESSAGE,
} from './ProductPurchase';

import type {Cart, OrderTypes} from '~/types/orders';
import type {SalesforceContract} from '~/types/salesforceContract';

type AIHubForm = z.infer<typeof zodSchema.aiHubForm> & {
	salesforceProjectId: string;
};

export class ProductPurchaseAIHub extends ProductPurchase {
	private form?: AIHubForm;
	protected orderTypeExternalReferenceCode: OrderTypes = 'AI_HUB';
	private salesforceContract?: SalesforceContract;
	private skuId?: number;
	private tier?: string;
	protected toleratedCheckoutErrorMessages = [
		INVALID_BILLING_ADDRESS_ERROR_MESSAGE,
	];

	setForm(form: AIHubForm) {
		this.form = form;
	}

	setSalesforceContract(salesforceContract: SalesforceContract) {
		this.salesforceContract = salesforceContract;
	}

	setSKUId(skuId: number) {
		this.skuId = skuId;
	}

	setTier(tier: string) {
		this.tier = tier;
	}

	protected getCart() {
		const baseCart = super.getCart();

		return {
			...baseCart,
			cartItems: super.getCartItems(this.skuId),
			customFields: {
				...baseCart?.customFields,
				[OrderCustomFields.ORDER_METADATA]: JSON.stringify({
					aiHubForm: this.form,
					contractEntityId: this.salesforceContract?.id,
					salesforceContractId:
						this.salesforceContract?.externalReferenceCode,
					salesforceProjectId: this.form?.salesforceProjectId,
					tier: this.tier,
				}),
			},
		} as Cart;
	}

	public async createOrder(cart: Cart, cartOptions: unknown) {
		if (!this.form) {
			throw new Error('Form is missing.');
		}

		const serviceCart = this.getCart();

		return super.createOrder(
			{
				...serviceCart,
				...cart,
				customFields: serviceCart.customFields,
			},
			cartOptions
		);
	}

	public async getNextStepsLink(cart: Cart) {
		return super.getPaymentNextStepsLink(cart);
	}
}
