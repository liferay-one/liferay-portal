/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import {useEffect} from 'react';
import checkCircleIcon from '~/assets/icons/check_circle_icon.svg';
import timesCircleIcon from '~/assets/icons/times_circle_icon.svg';
import {Header} from '~/components/Header/Header';
import {PageRenderer} from '~/components/Page/Page';
import useGetProductByOrderId from '~/hooks/useGetProductByOrderId';
import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import CommerceOrders from '~/services/spring-boot/CommerceOrders';
import {PaymentStatus} from '~/utils/orderUtils';
import {getSiteURL} from '~/utils/siteUtils';

type AIHubTokenNextStepsProps = {
	data: ReturnType<typeof useGetProductByOrderId>['data'];
	error: ReturnType<typeof useGetProductByOrderId>['error'];
	isLoading: ReturnType<typeof useGetProductByOrderId>['isLoading'];
};

const AIHubTokenNextSteps: React.FC<AIHubTokenNextStepsProps> = ({
	data,
	error,
	isLoading,
}: AIHubTokenNextStepsProps) => {
	const placedOrder = data?.placedOrder;

	const orderId = placedOrder?.id;
	const paymentStatus = placedOrder?.paymentStatus;

	useEffect(() => {
		if (!orderId || paymentStatus !== PaymentStatus.PAID) {
			return;
		}

		CommerceOrders.completeSettled(orderId).catch(console.error);
	}, [orderId, paymentStatus]);

	const isFailed =
		paymentStatus === PaymentStatus.CANCELED ||
		paymentStatus === PaymentStatus.FAILED;

	const isPaid = paymentStatus === PaymentStatus.PAID;

	return (
		<PageRenderer
			className="my-8 next-step-page-container"
			error={error}
			isLoading={isLoading}
		>
			<div className="liferay-ai-hub-container my-8">
				<div className="next-step-page-text">
					<Header
						description={
							<span className="text-center">
								<p className="mb-1 next-step-page-description">
									{isFailed
										? i18n.translate(
												'we-were-unable-to-process-the-payment-for-your-liferay-tokens-please-review-your-payment-details-and-try-again'
											)
										: null}
									{isPaid
										? i18n.translate(
												'your-tokens-will-be-credited-to-your-ai-hub-account-shortly-we-will-notify-you-by-email-once-they-are-available'
											)
										: null}
									{!isFailed && !isPaid
										? i18n.translate(
												'we-are-still-confirming-your-payment-your-tokens-will-be-credited-once-it-settles-and-we-will-notify-you-by-email'
											)
										: null}
								</p>
								<p className="mt-5">
									{i18n.translate('your-order-id-is')}{' '}
									<span className="next-step-page-text-highlight">
										{placedOrder?.id}
									</span>
								</p>
							</span>
						}
						icon={
							<span className="d-flex justify-content-center mb-4">
								<img
									alt={
										isFailed
											? 'payment failed icon'
											: 'payment success icon'
									}
									draggable="false"
									src={
										isFailed
											? timesCircleIcon
											: checkCircleIcon
									}
								/>
							</span>
						}
						title={
							<span className="d-flex justify-content-center mb-5 next-step-page-title text-center">
								{isFailed
									? i18n.translate('purchase-failed')
									: null}
								{isPaid
									? i18n.translate(
											'liferay-tokens-was-purchased-successfully'
										)
									: null}
								{!isFailed && !isPaid
									? i18n.translate('pending-payment')
									: null}
							</span>
						}
					/>
				</div>

				<div className="d-flex flex-column justify-content-center mt-4 next-step-page-footer-button-container w-100">
					<div>
						<ClayButton
							className="mr-3 next-step-page-footer-button-primary"
							displayType="primary"
							onClick={() => {
								Liferay.Util.navigate(
									`${getSiteURL()}/my-account`
								);
							}}
						>
							{i18n.translate('go-to-dashboard')}
						</ClayButton>
					</div>
				</div>
			</div>
		</PageRenderer>
	);
};

export default AIHubTokenNextSteps;
