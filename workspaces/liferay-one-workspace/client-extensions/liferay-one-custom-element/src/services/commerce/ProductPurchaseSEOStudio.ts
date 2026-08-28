/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {z} from 'zod';

import {OrderCustomFields} from '~/utils/orderUtils';
import {Cart, OrderTypes} from '~/types/orders';
import zodSchema from '~/schema/zodSchema';
import ProductPurchase from './ProductPurchase';

type SEOStudioForm = z.infer<typeof zodSchema.seoStudioForm> & {
	salesforceProjectId: string;
};

export class ProductPurchaseSEOStudio extends ProductPurchase {
	private form?: SEOStudioForm;
	protected orderTypeExternalReferenceCode = OrderTypes.SEO_STUDIO;

	setForm(form: SEOStudioForm) {
		this.form = form;
	}

	protected getCart() {
		return {
			...super.getCart(),
			customFields: {
				[OrderCustomFields.ORDER_METADATA]: JSON.stringify({
					salesforceProjectId: this.form?.salesforceProjectId,
					seoStudioForm: this.form,
				}),
			},
		} as Cart;
	}

	public async createOrder(cart: Cart, cartOptions: any) {
		if (!this.form) {
			throw new Error('Form is missing.');
		}

		return super.createOrder(
			{
				...cart,
				...this.getCart(),
			},
			cartOptions
		);
	}

	public async getNextStepsLink(cart: Cart) {
		return super.getPaymentNextStepsLink(cart);
	}
}
