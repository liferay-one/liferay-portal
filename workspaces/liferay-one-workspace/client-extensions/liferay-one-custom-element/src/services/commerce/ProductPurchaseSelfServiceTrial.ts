/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Trial from '~/services/spring-boot/Trial';
import {getSelfServiceTrialOrderType} from '~/utils/productUtils';

import ProductPurchase from './ProductPurchase';

import type {Account} from '~/types/accounts';
import type {Cart} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

export default class ProductPurchaseSelfServiceTrial extends ProductPurchase {
	constructor(account: Account, product: DeliveryProduct) {
		super(account, product);

		this.orderTypeExternalReferenceCode =
			getSelfServiceTrialOrderType(product);
	}

	public async createOrder(cart?: Cart): Promise<Cart> {
		const order = await super.createOrder(cart);

		await Trial.startSelfServiceTrial(order.id);

		return order;
	}

	public async getNextStepsLink(cart: Cart) {
		return `/next-steps?orderId=${cart.id}`;
	}
}
