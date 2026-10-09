/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import DetailTable, {Orientation} from '~/components/DetailTable/DetailTable';
import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import {useProject} from '~/context/ProjectContext';
import {useProjectEnvironments} from '~/hooks/useProjectEnvironments';
import i18n from '~/i18n';
import {filterEnvironmentsByProject} from '~/pages/MyAccount/Projects/utils/filterEnvironmentsByProject';
import {OrderCustomFields, OrderWorkflowStatusCode} from '~/utils/orderUtils';
import {safeJSONParse} from '~/utils/safeJSONParse';

import type {PlacedOrder} from '~/types/orders';

type SEOStudioDetailsProps = {
	placedOrder?: Pick<PlacedOrder, 'customFields' | 'orderStatusInfo'>;
};

const SEOStudioDetails = ({placedOrder}: SEOStudioDetailsProps) => {
	const {projectId} = useProject();
	const {environments} = useProjectEnvironments();

	const orderMetadata = safeJSONParse(
		placedOrder?.customFields?.[OrderCustomFields.ORDER_METADATA] || '{}',
		{}
	) as {
		seoStudioForm?: {
			administratorEmailAddress?: string;
		};
	};

	const aiHubURL =
		filterEnvironmentsByProject(projectId, environments).find(
			(environment) => environment.offering === 'AI Hub'
		)?.aiHubURL ?? '';

	const isActive =
		placedOrder?.orderStatusInfo?.code ===
		OrderWorkflowStatusCode.COMPLETED;

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
						title: i18n.translate('administration-email'),
						value: orderMetadata.seoStudioForm
							?.administratorEmailAddress,
					},
					{
						title: i18n.translate('ai-hub-url'),
						value:
							isActive && aiHubURL ? (
								<a
									href={
										aiHubURL.startsWith('http')
											? aiHubURL
											: `https://${aiHubURL}`
									}
									rel="noopener noreferrer"
									target="_blank"
								>
									{aiHubURL}
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
