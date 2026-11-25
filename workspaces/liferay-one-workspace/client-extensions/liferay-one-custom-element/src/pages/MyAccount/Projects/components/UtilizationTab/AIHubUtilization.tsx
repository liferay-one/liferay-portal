/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import ListView from '~/components/ListView/ListView';
import OrderStatus from '~/components/OrderStatus/OrderStatus';
import {useAITokenBlockSizes} from '~/hooks/useAITokenBlockSizes';
import {useDeliveryProduct} from '~/hooks/useDeliveryProduct';
import i18n from '~/i18n';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {Liferay} from '~/services/liferay/liferay';
import {formatUTCShortDate} from '~/utils/dateUtils';

import type {PlacedOrder} from '~/types/orders';

const AIHubUtilization = ({productId}: {productId?: number}) => {
	const accountId = Liferay.CommerceContext.account?.accountId;

	const {isLoading: tokenBlockSizesLoading, tokenBlockSizes} =
		useAITokenBlockSizes();

	const {data: product, isLoading: productLoading} = useDeliveryProduct(
		productId ? String(productId) : ''
	);

	const skuExternalReferenceCodes = useMemo(
		() =>
			new Map(
				(product?.skus ?? []).map((sku) => [
					sku.id,
					sku.externalReferenceCode,
				])
			),
		[product]
	);

	if (!accountId) {
		return null;
	}

	return (
		<DetailedCard
			cardIconAltText={i18n.translate('token-past-purchases')}
			cardTitle={i18n.translate('token-past-purchases')}
			className="mt-4 pb-0 tokens-card"
			clayIcon="coin"
		>
			<ListView<PlacedOrder>
				emptyStateProps={{
					className:
						'border px-4 py-6 d-flex align-items-center flex-column justify-content-center',
					type: 'BLANK',
				}}
				id={`token-past-purchases-${accountId}`}
				initialContext={{
					pageSize: 5,
					paginationDeltaOptions: [5, 10, 20],
				}}
				resource={`o/headless-commerce-delivery-order/v1.0/channels/${Liferay.CommerceContext.commerceChannelId}/accounts/${accountId}/placed-orders?filter=${SearchBuilder.eq('orderTypeExternalReferenceCode', 'AI_HUB_TOKEN')}&nestedFields=placedOrderItems&sort=createDate:desc`}
				tableProps={{
					columns: [
						{
							id: 'createDate',
							name: i18n.translate('date'),
							render: (createDate) =>
								formatUTCShortDate(createDate as string),
						},
						{
							id: 'placedOrderItems',
							name: i18n.translate('tokens'),
							render: (placedOrderItems) => {
								const item = placedOrderItems?.[0];

								const skuExternalReferenceCode = item
									? skuExternalReferenceCodes.get(item.skuId)
									: undefined;

								const tokenBlockSize = skuExternalReferenceCode
									? tokenBlockSizes.get(
											skuExternalReferenceCode
										)
									: undefined;

								if (
									productLoading ||
									tokenBlockSizesLoading ||
									!item ||
									!tokenBlockSize
								) {
									return '-';
								}

								return Intl.NumberFormat().format(
									tokenBlockSize * item.quantity
								);
							},
						},
						{
							id: 'summary',
							name: i18n.translate('amount'),
							render: (summary) => summary?.totalFormatted || '',
						},
						{
							id: 'orderStatusInfo',
							name: i18n.translate('status'),
							render: (_, item) => (
								<OrderStatus placedOrder={item} />
							),
						},
					],
				}}
			/>
		</DetailedCard>
	);
};

export default AIHubUtilization;
