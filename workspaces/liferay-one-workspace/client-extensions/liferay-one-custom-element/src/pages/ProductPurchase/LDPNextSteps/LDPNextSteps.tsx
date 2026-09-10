/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayIcon from '@clayui/icon';
import useSWR from 'swr';
import checkCircleIcon from '~/assets/icons/check_circle_icon.svg';
import {AccountAndAppCard} from '~/components/AccountAndAppCard/AccountAndAppCard';
import {Header} from '~/components/Header/Header';
import {PageRenderer} from '~/components/Page/Page';
import useGetProductByOrderId from '~/hooks/useGetProductByOrderId';
import i18n from '~/i18n';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {Liferay} from '~/services/liferay/liferay';
import {getAccountImage} from '~/utils/getAccountImage';
import {getSiteURL} from '~/utils/siteUtils';

type LDPNextStepsProps = {
	data: ReturnType<typeof useGetProductByOrderId>['data'];
	error: ReturnType<typeof useGetProductByOrderId>['error'];
	isLoading: ReturnType<typeof useGetProductByOrderId>['isLoading'];
};

const LDPNextSteps: React.FC<LDPNextStepsProps> = ({
	data,
	error,
	isLoading,
}: LDPNextStepsProps) => {
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
			<div className="my-8">
				<div className="next-step-page-cards">
					<AccountAndAppCard
						category={product?.catalogName as string}
						logo={data?.orderModel?.productThumbnail || 'catalog'}
						title={productName}
					/>

					<div className="mx-4">
						<ClayIcon
							className="m-0 next-step-page-icon"
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
					<Header
						description={
							<span className="text-center">
								<p className="mb-1 next-step-page-description">
									{i18n.translate(
										'your-liferay-data-platform-workspace-is-being-provisioned-an-email-will-be-sent-with-everything-you-need-to-access-it-once-it-is-ready-if-the-email-does-not-arrive-within-a-few-minutes-check-your-spam-folder'
									)}
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
									alt="check circle icon"
									draggable="false"
									src={checkCircleIcon}
								/>
							</span>
						}
						title={
							<span className="d-flex justify-content-center mb-5 next-step-page-title text-center">
								{i18n.translate('thank-you-for-your-purchase')}
							</span>
						}
					/>
				</div>

				<div className="d-flex justify-content-center mt-4 next-step-page-footer-button-container w-100">
					<ClayButton
						className="mr-3 next-step-page-footer-button-back"
						displayType="secondary"
						onClick={() => {
							Liferay.Util.navigate(`${getSiteURL()}/products`);
						}}
					>
						{i18n.translate('browse-products')}
					</ClayButton>

					<ClayButton
						className="next-step-page-footer-button-continue"
						displayType="primary"
						onClick={() => {
							Liferay.Util.navigate(`${getSiteURL()}/my-account`);
						}}
					>
						{i18n.translate('go-to-dashboard')}
					</ClayButton>
				</div>
			</div>
		</PageRenderer>
	);
};

export default LDPNextSteps;
