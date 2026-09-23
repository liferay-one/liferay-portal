/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import classNames from 'classnames';
import {useMemo, useState} from 'react';
import {Navigate} from 'react-router-dom';
import Section from '~/components/Section/Section';
import i18n from '~/i18n';
import LicenseTermsCheckbox from '~/pages/ProductPurchase/components/LicenseTermsCheckbox/LicenseTermsCheckbox';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import ProductPurchaseShell from '~/pages/ProductPurchase/components/ProductPurchaseShell/ProductPurchaseShell';
import useAccountAddresses from '~/pages/ProductPurchase/hooks/useAccountAddresses';
import {PaymentMethodType} from '~/pages/ProductPurchase/types';
import {Liferay} from '~/services/liferay/liferay';
import {
	formatCurrency,
	formatProductPrice,
	getCurrencyForCountry,
} from '~/utils/currencyUtils';
import {getProductPriceModel} from '~/utils/productUtils';

import type {BillingAddress} from '~/types/orders';

const Summary = () => {
	const [eulaAgreement, setEulaAgreement] = useState(false);

	const {
		actions: {previousStep},
		handlePurchase,
		isSingleAccount,
		isSubmitting,
		payment,
		product,
		selectedAccount,
	} = useProductPurchaseLayoutContext();

	const {data: accountAddressesResponse} = useAccountAddresses(
		selectedAccount?.id
	);

	const defaultAddress = useMemo(() => {
		const items = accountAddressesResponse?.items || [];

		if (selectedAccount?.defaultBillingAddressId) {
			const found = items.find(
				(item) => item.id === selectedAccount.defaultBillingAddressId
			);

			if (found) {
				return found;
			}
		}

		return (
			items.find(
				(
					item: BillingAddress & {
						addressType?: string;
						type?: number | string;
					}
				) =>
					item.type === 1 ||
					item.type === 3 ||
					(typeof item.type === 'string' &&
						item.type.toLowerCase().includes('billing')) ||
					(typeof item.addressType === 'string' &&
						item.addressType.toLowerCase().includes('billing'))
			) || items[0]
		);
	}, [accountAddressesResponse, selectedAccount]);

	if (!selectedAccount?.id) {
		return <Navigate replace to="/" />;
	}

	const {isPaidApp} = getProductPriceModel(product);

	const billingAddress = payment.billingAddress;

	const activeCurrencyCode =
		getCurrencyForCountry(
			billingAddress?.country ||
				billingAddress?.countryISOCode ||
				defaultAddress?.country ||
				defaultAddress?.countryISOCode
		) ||
		Liferay.CommerceContext.currency.currencyCode ||
		'USD';

	const freePrice = formatCurrency(0, activeCurrencyCode);

	const activeSku = product.skus?.[0];
	const formattedPrice = formatProductPrice(
		activeSku?.price?.price ?? 99,
		activeSku?.price?.priceFormatted,
		activeCurrencyCode
	);

	const summaryRows = [
		{
			label: i18n.translate('net-price'),
			value: isPaidApp ? formattedPrice : freePrice,
		},
		{
			label: i18n.translate('vat'),
			value: isPaidApp
				? formatCurrency(0, activeCurrencyCode)
				: freePrice,
		},
		{
			label: i18n.translate('total'),
			value: isPaidApp ? formattedPrice : freePrice,
		},
	];

	return (
		<ProductPurchaseShell
			footerProps={{
				backButtonProps: {
					className: classNames({
						'd-none': !isPaidApp && isSingleAccount,
					}),
					onClick: () => previousStep(),
				},
				continueButtonProps: {
					children: i18n.translate(
						isPaidApp ? 'purchase-app' : 'get-app'
					),
					disabled: !eulaAgreement || isSubmitting,
					onClick: () => handlePurchase(),
				},
			}}
			title={i18n.translate('summary')}
		>
			{isPaidApp && (
				<>
					<Section label={i18n.translate('billing-address')}>
						<div className="border p-3 rounded">
							<strong className="d-block">
								{billingAddress.name}
							</strong>

							<small className="text-muted">
								{[
									billingAddress.street1,
									billingAddress.city,
									billingAddress.regionISOCode,
									billingAddress.country,
								]
									.filter(Boolean)
									.join(', ')}
							</small>
						</div>
					</Section>

					<Section label={i18n.translate('payment-method')}>
						<div className="border p-3 rounded">
							{i18n.translate(
								payment.type === PaymentMethodType.PAY_NOW
									? 'pay-with-card'
									: 'pay-with-bank-transfer'
							)}
						</div>
					</Section>
				</>
			)}

			<h5 className="mb-2">{i18n.translate('order-summary')}</h5>

			<hr className="mt-0" />

			{summaryRows.map(({label, value}) => (
				<div className="align-items-center d-flex mb-1" key={label}>
					<span className="product-purchase-summary-label text-right">
						{label}:
					</span>

					<strong className="ml-2">{value}</strong>
				</div>
			))}

			<LicenseTermsCheckbox
				checked={eulaAgreement}
				onChange={() => setEulaAgreement(!eulaAgreement)}
				product={product}
			/>
		</ProductPurchaseShell>
	);
};

export default Summary;
