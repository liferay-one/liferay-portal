/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayIcon from '@clayui/icon';
import useSWR from 'swr';

import documentCircleIcon from '~/assets/icons/document_circle_icon.svg';
import {AccountAndAppCard} from '~/components/AccountAndAppCard/AccountAndAppCard';
import {Header} from '~/components/Header/Header';
import {PageRenderer} from '~/components/Page/Page';
import useGetProductByOrderId from '~/hooks/useGetProductByOrderId';
import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {getSiteURL} from '~/utils/siteUtils';
import {getAccountImage} from '~/utils/getAccountImage';

type SEOStudioNextStepsProps = {
	data: ReturnType<typeof useGetProductByOrderId>['data'];
	error: ReturnType<typeof useGetProductByOrderId>['error'];
	isLoading: ReturnType<typeof useGetProductByOrderId>['isLoading'];
};

const SEOStudioNextSteps: React.FC<SEOStudioNextStepsProps> = ({
	data,
	error,
	isLoading,
}: SEOStudioNextStepsProps) => {
	const placedOrder = data?.placedOrder;
	const product = data?.product;

	const accountId = placedOrder?.accountId;
	const productName = product?.name || '';

	const {data: accountCommerce} = useSWR(
		accountId ? `/next-steps/account-commerce/${accountId}` : null,
		() => HeadlessAdminUser.getAccount(accountId as unknown as string)
	);

	return (
		<PageRenderer
			className="my-8 next-step-page-container"
			error={error}
			isLoading={isLoading}
		>
			<div className="liferay-seo-studio-container my-8">
				<div className="next-step-page-cards">
					<AccountAndAppCard
						category={product?.catalogName as string}
						logo={
							data?.orderModel?.productThumbnail ||
							'catalog'
						}
						title={
							<div className="align-items-center d-flex">
								{productName}{' '}
							</div>
						}
					/>

					<div className="mx-4">
						<ClayIcon
							className="liferay-seo-studio-form-next-step-page-icon m-0 next-step-page-icon"
							symbol="arrow-right-full"
						/>
					</div>

					<AccountAndAppCard
						category="Account"
						logo={getAccountImage(
							accountCommerce?.logoURL as string
						)}
						title={accountCommerce?.name ?? ''}
					/>
				</div>

				<div className="next-step-page-text">
					<div className="next-step-page-text">
						<Header
							description={
								<span className="text-center">
									<p className="mb-1 next-step-page-description">
										Thank you for your purchase of{' '}
										<strong>SEO Studio.</strong> Your beta
										access request is being processed. We
										will notify you by email when your SEO
										Studio add-on is ready for use. If the
										message does not appear in your inbox,
										please check your Spam or Promotions
										folder.
									</p>
									<p className="mt-5">
										Order ID:{' '}
										<span className="next-step-page-text-highlight">
											{placedOrder?.id}
										</span>
									</p>
								</span>
							}
							icon={
								<span className="d-flex justify-content-center mb-4">
									<img
										alt="order received icon"
										draggable="false"
										src={documentCircleIcon}
									/>
								</span>
							}
							title={
								<span className="d-flex justify-content-center mb-5 next-step-page-title text-center">
									{i18n.translate('order-received')}
								</span>
							}
						/>
					</div>
				</div>

				<div className="d-flex flex-column justify-content-center mt-4 next-step-page-footer-button-container w-100">
					<div>
						<ClayButton
							className="mr-5 next-step-page-footer-button-secondary"
							displayType="secondary"
							onClick={() => {
								Liferay.Util.navigate(
									`${getSiteURL()}/products`
								);
							}}
						>
							{i18n.translate('browse-products')}
						</ClayButton>
						<ClayButton
							className="mr-3 next-step-page-footer-button-primary"
							displayType="primary"
							onClick={() => {
								Liferay.Util.navigate(
									`${getSiteURL()}/customer-dashboard/#/products`
								);
							}}
						>
							{i18n.translate('go-to-dashboard')}
						</ClayButton>
					</div>

					<span className="font-weight-semi-bold">
						Didn&apos;t receive the email?{' '}
						<a
							className="font-weight-bold"
							href="mailto:support@liferay.com"
						>
							support@liferay.com
						</a>
					</span>
				</div>
			</div>
		</PageRenderer>
	);
};

export default SEOStudioNextSteps;
