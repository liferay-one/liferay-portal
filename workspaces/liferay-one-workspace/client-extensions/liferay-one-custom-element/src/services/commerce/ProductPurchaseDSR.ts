/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {z} from 'zod';
import adminSchemas from '~/schema/adminSchemas';
import {Liferay} from '~/services/liferay/liferay';
import DSRRequests from '~/services/objects/DSRRequests';
import DigitalSalesRoom from '~/services/spring-boot/DigitalSalesRoom';

import ProductPurchase from './ProductPurchase';

import type {Account} from '~/types/accounts';
import type {Cart, OrderTypes} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

export type DSRFormData = z.infer<typeof adminSchemas.dsrLicenseKey>;

export type DSRSettings = {
	dataCenterLocation: string;
	hostName: string;
	ipAddresses: string;
	macAddresses: string;
	workspaceName: string;
	workspaceOwnerEmail: string;
};

function toCommaSeparated(value?: string) {
	return (value ?? '')
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.join(',');
}

export default class ProductPurchaseDSR extends ProductPurchase {
	protected orderTypeExternalReferenceCode: OrderTypes = 'DSR';

	constructor(
		account: Account,
		product: DeliveryProduct,
		private readonly form: DSRFormData
	) {
		super(account, product);
	}

	public async createOrder(cart?: Cart): Promise<Cart> {
		const dsrSettings = this.getDSRSettings();

		const order = await super.createOrder({
			...cart,
			customFields: {
				...cart?.customFields,
				dsrSettings: JSON.stringify(dsrSettings),
			},
		} as Cart);

		await DSRRequests.createDSRRequest({
			...dsrSettings,
			acceptTermsAndConditions: this.form.acceptTermsAndConditions,
			corpProjectName: dsrSettings.workspaceName,
			corpProjectUuid: this.account.externalReferenceCode,
			incidentReportEmailAddresses: dsrSettings.workspaceOwnerEmail,
			name: dsrSettings.workspaceName,
			ownerEmailAddress: dsrSettings.workspaceOwnerEmail,
			r_orderToDSRRequest_commerceOrderId: String(order.id),
			serverLocation: dsrSettings.dataCenterLocation,
		}).catch(console.error);

		await DigitalSalesRoom.provisioningOrder(order.id);

		return order;
	}

	private getDSRSettings(): DSRSettings {
		return {
			dataCenterLocation: this.form.dataCenterLocation,
			hostName: this.form.hostname?.trim() ?? '',
			ipAddresses: toCommaSeparated(this.form.ipAddress),
			macAddresses: toCommaSeparated(this.form.macAddress),
			workspaceName: this.form.workspaceName.trim(),
			workspaceOwnerEmail:
				this.form.workspaceOwnerEmail?.trim() ||
				Liferay.ThemeDisplay.getUserEmailAddress(),
		};
	}
}
