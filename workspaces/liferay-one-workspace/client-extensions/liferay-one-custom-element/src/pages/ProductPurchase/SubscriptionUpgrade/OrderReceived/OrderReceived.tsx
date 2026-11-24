/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import {useLocation} from 'react-router';
import useSWR from 'swr';
import documentCircleIconUrl from '~/assets/icons/document_circle_icon.svg';
import EmptyState from '~/components/EmptyState/EmptyState';
import Loading from '~/components/Loading/Loading';
import i18n from '~/i18n';
import ProductPurchaseHeaderCards from '~/pages/ProductPurchase/components/ProductPurchaseHeaderCards/ProductPurchaseHeaderCards';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {Liferay} from '~/services/liferay/liferay';
import {getSiteURL} from '~/utils/siteUtils';

import type {DeliveryProduct} from '~/types/product';

type OrderReceivedProps = {
	product: DeliveryProduct;
};

const OrderReceived = ({product}: OrderReceivedProps) => {
	const {search} = useLocation();

	const orderId = new URLSearchParams(search).get('orderId');

	const accountId = Liferay.CommerceContext.account?.accountId;

	const {data: account, isLoading} = useSWR(
		accountId ? `/account/${accountId}` : null,
		() => HeadlessAdminUser.getAccount(accountId!)
	);

	if (!orderId) {
		return (
			<EmptyState
				title={i18n.translate('no-results-found')}
				type="NOT_FOUND"
			/>
		);
	}

	if (isLoading) {
		return <Loading.Page />;
	}

	return (
		<div className="product-purchase-completed">
			<ProductPurchaseHeaderCards account={account} product={product} />

			<div className="d-flex justify-content-center mt-5">
				<img
					alt=""
					height="64px"
					src={documentCircleIconUrl}
					width="64px"
				/>
			</div>

			<h1 className="mt-4 product-purchase-shell-title text-center">
				{i18n.translate('order-received-awaiting-signature')}
			</h1>

			<p className="mt-3 text-center text-muted">
				{i18n.sub(
					'thank-you-for-your-purchase-of-x-an-order-form-will-be-sent-to-your-email-via-docusign-please-review-sign-and-return-it-to-confirm-your-subscription',
					product.name
				)}
			</p>

			<p className="mt-4 text-center">
				{i18n.translate('order-id')}:{' '}
				<strong className="text-primary">{orderId}</strong>
			</p>

			<hr className="my-4" />

			<div className="d-flex justify-content-center">
				<ClayButton
					displayType="secondary"
					onClick={() =>
						Liferay.Util.navigate(`${getSiteURL()}/products`)
					}
				>
					{i18n.translate('browse-products')}
				</ClayButton>

				<ClayButton
					className="ml-3"
					onClick={() =>
						Liferay.Util.navigate(`${getSiteURL()}/my-account`)
					}
				>
					{i18n.translate('go-to-dashboard')}
				</ClayButton>
			</div>

			<p className="font-weight-semi-bold mt-4 text-center">
				{i18n.translate('didn-t-receive-the-email')}{' '}
				<a href="mailto:support@liferay.com">support@liferay.com</a>
			</p>
		</div>
	);
};

export default OrderReceived;
