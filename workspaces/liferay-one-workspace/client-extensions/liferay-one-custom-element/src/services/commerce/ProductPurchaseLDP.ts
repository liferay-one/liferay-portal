/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import LiferayDataPlatform from '~/services/spring-boot/LiferayDataPlatform';

import ProductPurchase from './ProductPurchase';

import type {Account} from '~/types/accounts';
import type {Cart, OrderTypes} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

export type LDPSettings = {
	allowedEmailDomains: string[];
	dataCenterLocation: string;
	friendlyWorkspaceURL?: string;
	incidentReportContacts: string[];
	workspaceName: string;
	workspaceOwnerEmail: string;
};

export default class ProductPurchaseLDP extends ProductPurchase {
	protected orderTypeExternalReferenceCode: OrderTypes = 'LDP';

	constructor(
		account: Account,
		product: DeliveryProduct,
		private readonly ldpSettings: LDPSettings
	) {
		super(account, product);
	}

	public async createOrder(cart?: Cart): Promise<Cart> {
		const order = await super.createOrder({
			...cart,
			customFields: {
				...cart?.customFields,
				ldpSettings: JSON.stringify(this.ldpSettings),
			},
		} as Cart);

		LiferayDataPlatform.postProvisioningOrder(order.id).catch(
			console.error
		);

		return order;
	}
}
