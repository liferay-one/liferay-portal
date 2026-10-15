/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/i18n';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/utils/constants';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import {Liferay} from '~/services/liferay/liferay';
import ActivationKeys from '~/services/spring-boot/ActivationKeys';
import {getSelfServiceTrialOrderType} from '~/utils/productUtils';
import {getSiteURL} from '~/utils/siteUtils';

import ProductPurchase from './ProductPurchase';

import type {Account} from '~/types/accounts';
import type {Cart, OrderTypes} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

export const DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE = 'PRDCT-DXP-TRIAL';

const TRIAL_ENTITLEMENTS_POLL_ATTEMPTS = 10;

const TRIAL_ENTITLEMENTS_POLL_INTERVAL = 1000;

export default class ProductPurchaseSelfServiceTrial extends ProductPurchase {
	protected orderTypeExternalReferenceCode: OrderTypes;
	private dxpTrialProduct?: DeliveryProduct;

	constructor(account: Account, product: DeliveryProduct) {
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
		await this.loadDXPTrialProduct();

		return super.createOrder(cart);
	}

	public async getNextStepsLink() {
		if (!(await this.waitForTrialEntitlements())) {
			Liferay.Util.openToast({
				message: i18n.translate(
					'your-trial-is-still-being-prepared-refresh-the-page-in-a-few-minutes-if-it-is-not-listed'
				),
				type: 'warning',
			});
		}

		return `${window.location.origin}${getSiteURL()}/my-account#/${this.account.externalReferenceCode}/project/${ONE_TIME_PURCHASES}/activation/generate?new=${DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE}`;
	}

	public async hasTrialOrder() {
		const {items = []} =
			await HeadlessCommerceDeliveryOrder.getPlacedOrders(
				Liferay.CommerceContext.commerceChannelId,
				this.account.id,
				new URLSearchParams({
					filter: SearchBuilder.eq(
						'orderTypeExternalReferenceCode',
						this.orderTypeExternalReferenceCode
					),
					pageSize: '1',
				})
			);

		return !!items.length;
	}

	public async loadDXPTrialProduct() {
		this.dxpTrialProduct ??= await this.getDXPTrialProduct();
	}

	protected getCartItems(skuId?: number) {
		const [cartItem] = super.getCartItems(skuId);

		if (!this.dxpTrialProduct) {
			throw new Error(
				`Unable to find product ${DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE}`
			);
		}

		return [
			cartItem,
			{
				...cartItem,
				productId:
					this.dxpTrialProduct.productId ?? this.dxpTrialProduct.id,
				skuId: this.dxpTrialProduct.skus[0]?.id,
			},
		];
	}

	private async getDXPTrialProduct() {
		const {items = []} =
			await HeadlessCommerceDeliveryCatalog.getProductsPage(
				Liferay.CommerceContext.commerceChannelId,
				new URLSearchParams({
					'accountId': String(this.account.id),
					'filter': SearchBuilder.eq(
						'externalReferenceCode',
						DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE
					),
					'nestedFields': 'skus',
					'pageSize': '1',
					'skus.accountId': String(this.account.id),
				})
			);

		const [dxpTrialProduct] = items;

		if (!dxpTrialProduct?.skus?.length) {
			throw new Error(
				`Unable to find product ${DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE}`
			);
		}

		return dxpTrialProduct;
	}

	private async hasTrialEntitlements() {
		try {
			const {bundleProducts, products} =
				await ActivationKeys.getGenerateForm({
					accountExternalReferenceCode:
						this.account.externalReferenceCode,
				});

			const externalReferenceCodes = new Set(
				[...bundleProducts, ...products].map(
					({externalReferenceCode}) => externalReferenceCode
				)
			);

			return (
				externalReferenceCodes.has(
					DXP_TRIAL_PRODUCT_EXTERNAL_REFERENCE_CODE
				) &&
				externalReferenceCodes.has(this.product.externalReferenceCode)
			);
		}
		catch (error) {
			console.error(error);

			return false;
		}
	}

	private async waitForTrialEntitlements() {
		for (
			let attempt = 1;
			attempt <= TRIAL_ENTITLEMENTS_POLL_ATTEMPTS;
			attempt++
		) {
			if (await this.hasTrialEntitlements()) {
				return true;
			}

			if (attempt < TRIAL_ENTITLEMENTS_POLL_ATTEMPTS) {
				await new Promise((resolve) =>
					setTimeout(resolve, TRIAL_ENTITLEMENTS_POLL_INTERVAL)
				);
			}
		}

		return false;
	}
}
