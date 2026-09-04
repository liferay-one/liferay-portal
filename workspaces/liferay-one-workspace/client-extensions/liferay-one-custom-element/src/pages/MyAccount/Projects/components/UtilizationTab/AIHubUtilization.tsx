/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import ListView from '~/components/ListView/ListView';
import OrderStatus from '~/components/OrderStatus/OrderStatus';
import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import SearchBuilder from '~/utils/SearchBuilder';
import {safeJSONParse} from '~/utils/safeJSONParse';

import type {PlacedOrder} from '~/types/orders';

const AIHubUtilization = () => {
	const accountId = Liferay.CommerceContext.account?.accountId;

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
							render: (createDate) => {
								const date = new Date(createDate as string);

								return date.toLocaleDateString('en-US', {
									day: 'numeric',
									month: 'short',
									year: 'numeric',
								});
							},
						},
						{
							id: 'placedOrderItems',
							name: i18n.translate('tokens'),
							render: (placedOrderItems) => {
								const item = placedOrderItems?.[0];

								if (!item) {
									return '-';
								}

								type SkuOption = {
									skuOptionValueName?: string;
									skuOptionValueNames?: string[];
								};

								const options = safeJSONParse<SkuOption[]>(
									item.options,
									[]
								);

								const optionValue =
									options[0]?.skuOptionValueNames?.[0] ||
									options[0]?.skuOptionValueName ||
									'';

								return Intl.NumberFormat().format(
									Number(
										optionValue
											.replace(/[^\d]/g, '')
											.trim() || 0
									)
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
