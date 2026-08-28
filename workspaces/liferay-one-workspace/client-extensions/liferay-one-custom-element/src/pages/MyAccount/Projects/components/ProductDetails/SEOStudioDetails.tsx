/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useOutletContext} from 'react-router-dom';

import DetailTable, {Orientation} from '~/components/DetailTable/DetailTable';
import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import i18n from '~/i18n';
import type {PlacedOrder} from '~/types/orders';
import {OrderCustomFields} from '~/utils/orderUtils';
import {safeJSONParse} from '~/utils/safeJSONParse';

const SEOStudioDetails = () => {
	const {placedOrder} = useOutletContext<{placedOrder: PlacedOrder}>();

	const orderMetadata = safeJSONParse(
		placedOrder?.customFields?.[OrderCustomFields.ORDER_METADATA] || '{}',
		{}
	) as {
		seoStudioForm?: {
			administratorEmailAddress?: string;
			seoStudioAccountName?: string;
			seoStudioURL?: string;
		};
	};

	const seoStudioForm = orderMetadata?.seoStudioForm || {};
	const seoStudioURL = seoStudioForm?.seoStudioURL;

	return (
		<DetailedCard
			cardIconAltText="Profile Icon"
			cardTitle={i18n.translate('seo-studio-account-details' as any)}
			clayIcon="order-form-tag"
		>
			<DetailTable
				columns={2}
				items={[
					{
						className: 'mb-4',
						title: i18n.translate('seo-studio-account-name' as any),
						value: seoStudioForm?.seoStudioAccountName,
					},
					{
						className: 'mb-4',
						title: i18n.translate('administration-email' as any),
						value: seoStudioForm?.administratorEmailAddress,
					},
					{
						title: i18n.translate('seo-studio-url' as any),
						value: seoStudioURL ? (
							<a
								href={
									seoStudioURL.startsWith('http')
										? seoStudioURL
										: `https://${seoStudioURL}`
								}
								rel="noopener noreferrer"
								target="_blank"
							>
								{seoStudioURL}
							</a>
						) : (
							i18n.translate('pending')
						),
					},
				]}
				orientation={Orientation.VERTICAL}
			/>
		</DetailedCard>
	);
};

export default SEOStudioDetails;
