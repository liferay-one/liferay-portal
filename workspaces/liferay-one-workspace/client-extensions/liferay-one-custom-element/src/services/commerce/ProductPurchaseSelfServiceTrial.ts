/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {SolutionTypes} from '~/enums/Product';
import LicenseKeys from '~/services/spring-boot/LicenseKeys';
import {OrderTypes} from '~/types/orders';
import {
	ProductSpecificationKey,
	getProductSpecificationValue,
} from '~/utils/productUtils';

import ProductPurchase from './ProductPurchase';

import type {Account} from '~/types/accounts';
import type {Cart} from '~/types/orders';
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

		this.orderTypeExternalReferenceCode =
			getProductSpecificationValue(
				ProductSpecificationKey.SOLUTION_TYPE,
				product
			) === SolutionTypes.DSR_TRIAL
				? OrderTypes.DSR_TRIAL
				: OrderTypes.CMP_TRIAL;
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
