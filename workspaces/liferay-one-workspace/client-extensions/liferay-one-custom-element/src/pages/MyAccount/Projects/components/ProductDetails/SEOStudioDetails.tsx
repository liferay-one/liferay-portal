/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import DetailTable, {Orientation} from '~/components/DetailTable/DetailTable';
import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import i18n from '~/i18n';
import {OrderCustomFields} from '~/utils/orderUtils';
import {safeJSONParse} from '~/utils/safeJSONParse';

import type {PlacedOrder} from '~/types/orders';

type SEOStudioDetailsProps = {
	placedOrder?: Pick<PlacedOrder, 'customFields'>;
};

const SEOStudioDetails = ({placedOrder}: SEOStudioDetailsProps) => {
	const orderMetadata = safeJSONParse(
		placedOrder?.customFields?.[OrderCustomFields.ORDER_METADATA] || '{}',
		{}
	) as {
		seoStudioForm?: {
			administratorEmailAddress?: string;
			seoStudioAccountName?: string;
		};
	};

	const aiHubURL = 'https://ai.hub.liferay.com';
	const seoStudioForm = orderMetadata?.seoStudioForm || {};

	return (
		<DetailedCard
			cardIconAltText="Profile Icon"
			cardTitle={i18n.translate('seo-studio-account-details')}
			clayIcon="order-form-tag"
		>
			<DetailTable
				columns={2}
				items={[
					{
						className: 'mb-4',
						title: i18n.translate('seo-studio-account-name'),
						value: seoStudioForm?.seoStudioAccountName,
					},
					{
						className: 'mb-4',
						title: i18n.translate('administration-email'),
						value: seoStudioForm?.administratorEmailAddress,
					},
					{
						title: i18n.translate('ai-hub-url'),
						value: (
							<a
								href={aiHubURL}
								rel="noopener noreferrer"
								target="_blank"
							>
								{aiHubURL}
							</a>
						),
					},
				]}
				orientation={Orientation.VERTICAL}
			/>
		</DetailedCard>
	);
};

export default SEOStudioDetails;
