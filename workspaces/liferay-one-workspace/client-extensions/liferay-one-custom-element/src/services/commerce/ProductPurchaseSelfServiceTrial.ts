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
import CommerceOrders from '~/services/spring-boot/CommerceOrders';
import {getSelfServiceTrialOrderType} from '~/utils/productUtils';
import {getSiteURL} from '~/utils/siteUtils';

import ProductPurchase, {
	INVALID_BILLING_ADDRESS_ERROR_MESSAGE,
} from './ProductPurchase';

import type {
	ActivationKeyServer,
	ActivationKeyServerField,
	GenerateActivationKeyRequest,
	GenerateForm,
} from '~/services/spring-boot/ActivationKeys';
import type {Account} from '~/types/accounts';
import type {Cart, OrderTypes} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

export type SelfServiceTrialServer = {
	environmentName: string;
	serverField: ActivationKeyServerField;
	serverValue: string;
};

const TRIAL_ENTITLEMENTS_POLL_ATTEMPTS = 10;

const TRIAL_ENTITLEMENTS_POLL_INTERVAL = 1000;

export default class ProductPurchaseSelfServiceTrial extends ProductPurchase {
	protected orderTypeExternalReferenceCode: OrderTypes;
	protected toleratedCheckoutErrorMessages = [
		INVALID_BILLING_ADDRESS_ERROR_MESSAGE,
	];
	private dxpTrialProduct?: DeliveryProduct;

	constructor(
		account: Account,
		private readonly dxpTrialProductExternalReferenceCode: string,
		product: DeliveryProduct,
		private readonly server?: SelfServiceTrialServer
	) {
		super(account, product);

		if (!dxpTrialProductExternalReferenceCode) {
			throw new Error(
				'Unable to start a trial without the DXP trial product external reference code'
			);
		}

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

	public async getNextStepsLink(cart: Cart) {
		await CommerceOrders.completeSettled(cart.id).catch(console.error);

		const generateForm = await this.waitForTrialGenerateForm();

		if (!generateForm) {
			Liferay.Util.openToast({
				message: i18n.translate(
					'your-trial-is-still-being-prepared-refresh-the-page-in-a-few-minutes-if-it-is-not-listed'
				),
				type: 'warning',
			});

			return this.getGenerateActivationKeyLink();
		}

		const generateActivationKeyRequest =
			this.getGenerateActivationKeyRequest(generateForm);

		if (!generateActivationKeyRequest) {
			return this.getGenerateActivationKeyLink();
		}

		try {
			await ActivationKeys.generateActivationKey(
				generateActivationKeyRequest
			);
		}
		catch (error) {
			console.error(error);

			Liferay.Util.openToast({
				message: i18n.translate(
					'your-trial-started-but-its-activation-key-could-not-be-generated-generate-it-from-the-activation-page'
				),
				type: 'warning',
			});

			return this.getGenerateActivationKeyLink();
		}

		return `${this.getProjectLink()}/activation`;
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
				`Unable to find product ${this.dxpTrialProductExternalReferenceCode}`
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
						this.dxpTrialProductExternalReferenceCode
					),
					'nestedFields': 'skus',
					'pageSize': '1',
					'skus.accountId': String(this.account.id),
				})
			);

		const [dxpTrialProduct] = items;

		if (!dxpTrialProduct?.skus?.length) {
			throw new Error(
				`Unable to find product ${this.dxpTrialProductExternalReferenceCode}`
			);
		}

		return dxpTrialProduct;
	}

	private getGenerateActivationKeyLink() {
		return `${this.getProjectLink()}/activation/generate?new=${this.dxpTrialProductExternalReferenceCode}`;
	}

	private getGenerateActivationKeyRequest(
		generateForm: GenerateForm
	): GenerateActivationKeyRequest | undefined {
		if (!this.server) {
			return;
		}

		const dxpTrialProduct = generateForm.products.find(
			({externalReferenceCode}) =>
				externalReferenceCode ===
				this.dxpTrialProductExternalReferenceCode
		);

		const [version] = dxpTrialProduct?.versions ?? [];

		const keyType = dxpTrialProduct?.keyTypes.find(({subscriptions}) =>
			subscriptions.some(({availableCount}) => availableCount > 0)
		);

		const subscription = keyType?.subscriptions.find(
			({availableCount}) => availableCount > 0
		);

		if (!keyType || !subscription || !version) {
			return;
		}

		const server: ActivationKeyServer = {
			hostName: '',
			ipAddresses: '',
			macAddresses: '',
			[this.server.serverField]: this.server.serverValue.trim(),
		};

		return {
			accountExternalReferenceCode: this.account.externalReferenceCode,
			bundleEntitlementIds: generateForm.bundleProducts
				.filter(
					({availableCount, externalReferenceCode, licensable}) =>
						availableCount > 0 &&
						externalReferenceCode ===
							this.product.externalReferenceCode &&
						licensable
				)
				.map(({entitlementId}) => entitlementId),
			environmentName: this.server.environmentName.trim(),
			keyType: keyType.key,
			servers: [server],
			subscriptionEntitlementId: subscription.entitlementId,
			version,
		};
	}

	private getProjectLink() {
		return `${window.location.origin}${getSiteURL()}/my-account#/${this.account.externalReferenceCode}/project/${ONE_TIME_PURCHASES}`;
	}

	private async getTrialGenerateForm() {
		try {
			const generateForm = await ActivationKeys.getGenerateForm({
				accountExternalReferenceCode:
					this.account.externalReferenceCode,
			});

			const externalReferenceCodes = new Set(
				[...generateForm.bundleProducts, ...generateForm.products].map(
					({externalReferenceCode}) => externalReferenceCode
				)
			);

			if (
				externalReferenceCodes.has(
					this.dxpTrialProductExternalReferenceCode
				) &&
				externalReferenceCodes.has(this.product.externalReferenceCode)
			) {
				return generateForm;
			}
		}
		catch (error) {
			console.error(error);
		}
	}

	private async waitForTrialGenerateForm() {
		for (
			let attempt = 1;
			attempt <= TRIAL_ENTITLEMENTS_POLL_ATTEMPTS;
			attempt++
		) {
			const generateForm = await this.getTrialGenerateForm();

			if (generateForm) {
				return generateForm;
			}

			if (attempt < TRIAL_ENTITLEMENTS_POLL_ATTEMPTS) {
				await new Promise((resolve) =>
					setTimeout(resolve, TRIAL_ENTITLEMENTS_POLL_INTERVAL)
				);
			}
		}
	}
}
