/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useMemo, useRef, useState} from 'react';
import {Outlet, useLocation, useNavigate, useOutletContext} from 'react-router';
import AccountAvatar from '~/components/AccountAvatar/AccountAvatar';
import Loading from '~/components/Loading/Loading';
import i18n from '~/i18n';
import BasePurchase from '~/services/commerce/ProductPurchase';
import ProductPurchaseApp from '~/services/commerce/ProductPurchaseApp';
import ProductPurchaseLDP, {
	LDPSettings,
} from '~/services/commerce/ProductPurchaseLDP';
import {Liferay} from '~/services/liferay/liferay';
import {formatCurrency, getCurrencyForCountry} from '~/utils/currencyUtils';
import {
	getAiHubTierSKU,
	getLicenseTagText,
	getProductPriceModel,
	isLDPProduct,
	isLRTokensProduct,
} from '~/utils/productUtils';

import {useAppPurchaseContext} from '../../context/AppPurchaseContext';
import useAccountSKUs from '../../hooks/useAccountSKUs';
import useAccounts from '../../hooks/useAccounts';
import useChannelCurrencies from '../../hooks/useChannelCurrencies';
import useProductPurchaseCart from '../../hooks/useProductPurchaseCart';
import {ProductPurchaseStepItem} from '../../productPurchaseRoutes';
import {PaymentMethodType, ProductPurchasePayment} from '../../types';
import ProductPurchaseHeader from '../ProductPurchaseHeader/ProductPurchaseHeader';
import ProductPurchaseSteps from '../ProductPurchaseSteps/ProductPurchaseSteps';

import type {Account} from '~/types/accounts';
import type {BillingAddress, Cart} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

type ProductPurchaseLayoutProps = {
	product: DeliveryProduct;
	steps: ProductPurchaseStepItem[];
};

export type ProductPurchaseLayoutContext = {
	accountCurrencyCode: string | undefined;
	accounts: Account[];
	actions: {
		nextStep: () => void;
		previousStep: () => void;
	};
	form: Record<string, unknown>;
	handlePurchase: (
		customService?: BasePurchase,
		options?: unknown
	) => Promise<void>;
	isLoadingAccounts: boolean;
	isSingleAccount: boolean;
	isSubmitting: boolean;
	isUpdatingCart: boolean;
	payment: ProductPurchasePayment;
	product: DeliveryProduct;
	productPurchaseCart: ReturnType<typeof useProductPurchaseCart>;
	selectedAccount: Account;
	setForm: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
	setLDPSettings: React.Dispatch<React.SetStateAction<LDPSettings | null>>;
	setPayment: React.Dispatch<React.SetStateAction<ProductPurchasePayment>>;
	setSelectedAccount: React.Dispatch<React.SetStateAction<Account>>;
	skuRef: React.MutableRefObject<string | undefined>;
	steps: ProductPurchaseStepItem[];
};

const ProductPurchaseLayout = ({
	product,
	steps: stepItems,
}: ProductPurchaseLayoutProps) => {
	const [isSubmitting, setSubmitting] = useState(false);
	const isSubmittingRef = useRef(false);
	const [ldpSettings, setLDPSettings] = useState<LDPSettings | null>(null);
	const [payment, setPayment] = useState<ProductPurchasePayment>({
		billingAddress: {} as BillingAddress,
		invoice: {email: '', purchaseOrderNumber: ''},
		taxId: '',
		type: PaymentMethodType.PAY_NOW,
	});

	const {accounts, isLoading, selectedAccount, setSelectedAccount} =
		useAccounts();

	const {salesforceProject} = useAppPurchaseContext();

	const isAiHubTokens = isLRTokensProduct(product);

	const {isFreeApp, isPaidApp} = getProductPriceModel(product);

	const skuRef = useRef<string | undefined>(
		new URLSearchParams(window.location.search).get('skuRef') ??
			product.skus?.[0]?.externalReferenceCode
	);

	const aiHubTierSKU = isAiHubTokens
		? undefined
		: getAiHubTierSKU(product, skuRef.current);

	useEffect(() => {
		setPayment((previousPayment) => ({
			...previousPayment,
			billingAddress: {} as BillingAddress,
			defaultBillingAddressId: undefined,
		}));
	}, [selectedAccount?.id]);

	const billingAddressCurrencyCode =
		payment.billingAddress?.name &&
		payment.billingAddress.id !== payment.defaultBillingAddressId
			? getCurrencyForCountry(
					payment.billingAddress.country ||
						payment.billingAddress.countryISOCode
				)
			: undefined;

	const {data: accountSKUsPage, isLoading: isLoadingAccountSKUs} =
		useAccountSKUs(
			selectedAccount?.id,
			billingAddressCurrencyCode,
			product.productId ?? product.id
		);

	const {data: channelCurrenciesPage} = useChannelCurrencies();

	const accountCurrencyName = isLoadingAccountSKUs
		? undefined
		: accountSKUsPage?.items?.[0]?.price?.currency;

	const accountCurrency = useMemo(
		() =>
			accountCurrencyName
				? channelCurrenciesPage?.items?.find((channelCurrency) =>
						Object.values(channelCurrency.name).includes(
							accountCurrencyName
						)
					)
				: undefined,
		[accountCurrencyName, channelCurrenciesPage]
	);

	const productPurchaseCart = useProductPurchaseCart(
		accountCurrency,
		selectedAccount?.id,
		payment.billingAddress?.id,
		isAiHubTokens
			? 'AI_HUB_TOKEN'
			: ProductPurchaseApp.getOrderTypeExternalReferenceCode(product),
		product
	);

	const accountProduct = useMemo(
		() =>
			accountSKUsPage?.items?.length
				? {...product, skus: accountSKUsPage.items}
				: product,
		[accountSKUsPage, product]
	);

	const activeSku =
		accountProduct.skus?.find(
			(sku) => sku?.externalReferenceCode === skuRef.current
		) || accountProduct.skus?.[0];

	const {pathname} = useLocation();

	const licenseStepIndex = stepItems.findIndex(
		(stepItem) => stepItem.key === '/license'
	);

	const isCartPriceStep =
		licenseStepIndex !== -1 &&
		stepItems.findIndex((stepItem) => stepItem.key === pathname) >=
			licenseStepIndex;

	const cartPrice =
		productPurchaseCart.cart?.summary?.subtotalFormatted ||
		formatCurrency(
			0,
			accountCurrency?.code ??
				Liferay.CommerceContext.currency.currencyCode
		);

	const priceLabel = isFreeApp
		? i18n.translate('free')
		: (isCartPriceStep && cartPrice) ||
			activeSku?.price?.priceFormatted ||
			aiHubTierSKU?.price?.priceFormatted ||
			productPurchaseCart.cart?.summary?.totalFormatted ||
			i18n.translate('free');

	const navigate = useNavigate();

	const [form, setForm] = useState<Record<string, unknown>>({});

	const steps = stepItems.map((stepItem) => ({
		active: pathname === stepItem.key,
		key: stepItem.key,
		title: stepItem.title,
	}));

	const activeStepIndex = steps.findIndex(({active}) => active);

	const stepNavigate = (stepNumber: number) => {
		const step = steps[activeStepIndex + stepNumber];

		if (step) {
			navigate(step.key, {state: {stepBack: stepNumber < 0}});
		}
	};

	const handlePurchase = async (
		customService?: BasePurchase,
		options?: unknown
	) => {
		if (isSubmittingRef.current) {
			return;
		}

		isSubmittingRef.current = true;
		setSubmitting(true);

		let redirecting = false;

		try {
			const productPurchase =
				customService ||
				(isLDPProduct(product) && ldpSettings
					? new ProductPurchaseLDP(
							selectedAccount,
							product,
							ldpSettings
						)
					: new ProductPurchaseApp(
							selectedAccount,
							product,
							salesforceProject
						));

			if (isPaidApp && !customService) {
				const cart = await productPurchase.createOrder({
					...productPurchaseCart.cart,
					billingAddress: payment.billingAddress,
					cartItems: productPurchaseCart.cartItems,
					paymentMethod:
						payment.type === PaymentMethodType.PAY_NOW
							? 'paypal-integration'
							: 'money-order',
					shippingAddress: payment.billingAddress,
				});

				if (payment.type === PaymentMethodType.PAY_NOW) {
					const paymentNextStepsLink =
						await productPurchase.getPaymentNextStepsLink(cart);

					productPurchaseCart.reset();

					redirecting = true;

					window.location.href = paymentNextStepsLink;

					return;
				}

				productPurchaseCart.reset();

				navigate(`/bank-transfer-completed?orderId=${cart.id}`, {
					state: {account: selectedAccount},
				});

				return;
			}

			const cartOptions = options as Record<string, unknown> | undefined;
			const order = await productPurchase.createOrder(
				cartOptions as Cart,
				cartOptions?.cartOptions ?? options
			);

			const nextLink = await productPurchase.getNextStepsLink(order);

			productPurchaseCart.reset();

			if (nextLink.startsWith('http')) {
				redirecting = true;

				window.location.href = nextLink;

				return;
			}

			navigate(nextLink, {
				state: {account: selectedAccount},
			});
		}
		catch (error) {
			console.error(error);

			Liferay.Util.openToast({
				message: i18n.translate('an-unexpected-error-occurred'),
				type: 'danger',
			});
		}
		finally {
			if (!redirecting) {
				isSubmittingRef.current = false;
				setSubmitting(false);
			}
		}
	};

	const context: ProductPurchaseLayoutContext = {
		accountCurrencyCode: accountCurrency?.code,
		accounts,
		actions: {
			nextStep: () => stepNavigate(1),
			previousStep: () => stepNavigate(-1),
		},
		form,
		handlePurchase,
		isLoadingAccounts: isLoading,
		isSingleAccount: accounts.length === 1,
		isSubmitting,
		isUpdatingCart:
			isLoadingAccountSKUs ||
			productPurchaseCart.isSyncingCart ||
			productPurchaseCart.isUpdatingBillingAddress,
		payment,
		product: accountProduct,
		productPurchaseCart,
		selectedAccount,
		setForm,
		setLDPSettings,
		setPayment,
		setSelectedAccount,
		skuRef,
		steps: stepItems,
	};

	return (
		<>
			{isSubmitting && (
				<Loading.FullScreen>
					{i18n.translate(
						'hang-tight-your-purchase-is-being-processed'
					)}
				</Loading.FullScreen>
			)}

			<ProductPurchaseHeader
				product={product}
				rightNode={
					<div className="text-right">
						<small className="d-block text-muted text-nowrap">
							{i18n.translate('price')}
						</small>

						<div className="d-flex flex-column">
							<span className="font-weight-semi-bold text-nowrap">
								{priceLabel}
							</span>

							<span className="badge badge-primary m-0">
								{getLicenseTagText(product)}
							</span>
						</div>
					</div>
				}
			>
				{selectedAccount?.id && (
					<>
						<hr className="mx-n4 my-4" />

						<div className="align-items-center d-flex justify-content-between">
							<span className="font-weight-semi-bold text-muted">
								{i18n.translate('account-selected')}
							</span>

							<div className="align-items-center d-flex">
								<div className="mr-3 text-right">
									<strong className="d-block">
										{selectedAccount.name}
									</strong>

									<small className="text-muted">
										{Liferay.ThemeDisplay.getUserEmailAddress()}
									</small>
								</div>

								<AccountAvatar
									logoURL={selectedAccount.logoURL}
									type={selectedAccount.type}
								/>
							</div>
						</div>
					</>
				)}
			</ProductPurchaseHeader>

			<div className="bg-white border d-flex flex-column mt-4 p-4 pt-5 rounded">
				<ProductPurchaseSteps className="mb-4" steps={steps} />

				<Outlet context={context} />
			</div>
		</>
	);
};

const useProductPurchaseLayoutContext = () =>
	useOutletContext<ProductPurchaseLayoutContext>();

export {useProductPurchaseLayoutContext};

export default ProductPurchaseLayout;
