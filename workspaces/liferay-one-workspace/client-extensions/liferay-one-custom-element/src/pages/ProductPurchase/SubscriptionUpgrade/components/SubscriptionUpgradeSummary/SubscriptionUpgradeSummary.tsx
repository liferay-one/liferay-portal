/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import {useModal} from '@clayui/modal';
import {ReactNode, useRef, useState} from 'react';
import {useNavigate} from 'react-router';
import Loading from '~/components/Loading/Loading';
import Section from '~/components/Section/Section';
import i18n from '~/i18n';
import ConfirmPurchaseModal from '~/pages/ProductPurchase/SubscriptionUpgrade/components/ConfirmPurchaseModal/ConfirmPurchaseModal';
import {useSubscriptionUpgradeLayoutContext} from '~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeLayout/SubscriptionUpgradeLayout';
import ProductPurchaseShell from '~/pages/ProductPurchase/components/ProductPurchaseShell/ProductPurchaseShell';
import useAccountAddresses from '~/pages/ProductPurchase/hooks/useAccountAddresses';
import {Liferay} from '~/services/liferay/liferay';
import {isBillingAddress} from '~/utils/orderUtils';

import type {BillingAddress} from '~/types/orders';
import type {SubscriptionUpgradeOrder} from '~/types/subscriptionUpgrade';

type SubscriptionUpgradeSummaryProps = {
	children: ReactNode;
	confirmPurchaseModalClassName?: string;
	disabled?: boolean;
	onConfirm: (
		billingAddress: BillingAddress
	) => Promise<SubscriptionUpgradeOrder>;
};

const SubscriptionUpgradeSummary = ({
	children,
	confirmPurchaseModalClassName,
	disabled,
	onConfirm,
}: SubscriptionUpgradeSummaryProps) => {
	const [isSubmitting, setSubmitting] = useState(false);
	const isSubmittingRef = useRef(false);

	const {
		account,
		actions: {exit, previousStep},
	} = useSubscriptionUpgradeLayoutContext();

	const {data: addressResponse, isLoading} = useAccountAddresses(account.id);

	const {observer, onOpenChange, open} = useModal();

	const navigate = useNavigate();

	const billingAddresses = (addressResponse?.items ?? []).filter(
		isBillingAddress
	);

	const billingAddress =
		billingAddresses.find(
			(billingAddress) =>
				billingAddress.id === account.defaultBillingAddressId
		) ?? billingAddresses[0];

	const handleConfirm = async () => {
		if (isSubmittingRef.current || !billingAddress) {
			return;
		}

		isSubmittingRef.current = true;
		setSubmitting(true);

		onOpenChange(false);

		try {
			const {orderId} = await onConfirm(billingAddress);

			navigate(`/order-received?orderId=${orderId}`);
		}
		catch (error) {
			console.error(error);

			Liferay.Util.openToast({
				message: i18n.translate('an-unexpected-error-occurred'),
				type: 'danger',
			});

			isSubmittingRef.current = false;
			setSubmitting(false);
		}
	};

	if (isLoading) {
		return <Loading.Page />;
	}

	return (
		<ProductPurchaseShell
			footerProps={{
				backButtonProps: {onClick: previousStep},
				cancelButtonProps: {onClick: exit},
				continueButtonProps: {
					disabled: disabled || !billingAddress || isSubmitting,
					onClick: () => onOpenChange(true),
				},
			}}
			title={i18n.translate('summary')}
		>
			{isSubmitting && (
				<Loading.FullScreen>
					{i18n.translate(
						'hang-tight-your-purchase-is-being-processed'
					)}
				</Loading.FullScreen>
			)}

			<p className="mb-4 subscription-upgrade-summary-description text-muted">
				{i18n.translate(
					'please-review-the-order-summary-below-to-complete-your-purchase'
				)}
			</p>

			<Section
				className="subscription-upgrade-summary-item"
				label={i18n.translate('billing-address')}
			>
				{billingAddress ? (
					<div className="border p-3 rounded subscription-upgrade-summary-billing-address">
						<strong className="d-block">
							{billingAddress.name}
						</strong>

						<small className="text-muted">
							{[
								billingAddress.street1,
								billingAddress.city,
								billingAddress.regionISOCode,
								billingAddress.countryISOCode,
							]
								.filter(Boolean)
								.join(', ')}
						</small>
					</div>
				) : (
					<ClayAlert className="mb-0" displayType="warning">
						{i18n.translate(
							'this-account-has-no-billing-address-add-one-in-the-account-details-to-continue'
						)}
					</ClayAlert>
				)}
			</Section>

			<Section
				className="subscription-upgrade-summary-item"
				label={i18n.translate('payment-agreement')}
			>
				<ClayAlert
					className="mb-0 subscription-upgrade-summary-payment-agreement"
					displayType="info"
				>
					{i18n.translate(
						'this-transaction-will-be-processed-according-to-your-active-billing-and-payment-agreement'
					)}
				</ClayAlert>
			</Section>

			{children}

			<ConfirmPurchaseModal
				className={confirmPurchaseModalClassName}
				observer={observer}
				onCancel={() => onOpenChange(false)}
				onConfirm={handleConfirm}
				visible={open}
			/>
		</ProductPurchaseShell>
	);
};

export default SubscriptionUpgradeSummary;
