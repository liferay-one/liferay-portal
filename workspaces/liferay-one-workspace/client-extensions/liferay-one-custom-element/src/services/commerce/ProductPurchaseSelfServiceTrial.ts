/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import LicenseKeys from '~/services/spring-boot/LicenseKeys';
import {getSelfServiceTrialOrderType} from '~/utils/productUtils';

import ProductPurchase from './ProductPurchase';

import type {Account} from '~/types/accounts';
import type {Cart, OrderTypes} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

import type {ActivationKeyFormData} from './ProductPurchaseDXPFree';

export default class ProductPurchaseSelfServiceTrial extends ProductPurchase {
	protected orderTypeExternalReferenceCode: OrderTypes;

	constructor(
		account: Account,
		product: DeliveryProduct,
		private readonly form: ActivationKeyFormData
	) {
		super(account, product);

		const orderTypeExternalReferenceCode =
			getSelfServiceTrialOrderType(product);

		if (!orderTypeExternalReferenceCode) {
			throw new Error(
				`Unable to find the trial order type of product ${product.externalReferenceCode}`
			);
		}

		this.orderTypeExternalReferenceCode = orderTypeExternalReferenceCode;
	}

	public async createOrder(cart?: Cart): Promise<Cart> {
		const order = await super.createOrder(cart);

		await LicenseKeys.createLicenseKeyTypeTrial({
			domains: this.form.domain,
			orderId: String(order.id),
			owner: this.form.businessEmailAddress,
		});

		return order;
	}

	public async getNextStepsLink(cart: Cart) {
		return `/purchase-completed?orderId=${cart.id}`;
	}
}
