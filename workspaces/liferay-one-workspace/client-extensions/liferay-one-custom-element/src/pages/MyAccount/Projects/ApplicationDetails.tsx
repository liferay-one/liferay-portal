/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useParams} from 'react-router-dom';

import {useProject} from '../../../context/ProjectContext';
import {useLiferayBundles} from '../../../hooks/data/useLiferayBundles';
import {useDeliveryProduct} from '../../../hooks/data/useProduct';
import {
	getSpecificationValue,
	getSpecificationValues,
} from '../../../hooks/data/useProjectCommerce';
import {
	getProductOrderInfo,
	useProjectOrders,
} from '../../../hooks/data/useProjectOrders';
import i18n from '../../../i18n';
import {Liferay} from '../../../liferay/liferay';
import ActivationKeysCard from './ActivationKeysCard';
import DetailHeader from './DetailHeader';
import DetailsCard from './DetailsCard';
import DownloadListCard from './DownloadListCard';
import HelpSupportCard from './HelpSupportCard';
import ProjectDetailTabs, {DetailTab} from './ProjectDetailTabs';
import {getLogoColor} from './visuals';

export default function ApplicationDetails() {
	const {applicationId} = useParams();
	const {projectId, projects} = useProject();

	const projectName = projects.find(
		(project) => project.externalReferenceCode === projectId
	)?.name;

	const {data: application, isLoading} = useDeliveryProduct(
		applicationId ?? ''
	);
	const {placedOrders} = useProjectOrders(projectName);
	const {bundles} = useLiferayBundles();

	if (isLoading) {
		return (
			<ProjectDetailTabs
				header={
					<p className="text-neutral-7">
						{i18n.translate('loading')}
					</p>
				}
				tabs={[]}
			/>
		);
	}

	if (!application) {
		return (
			<ProjectDetailTabs
				header={
					<p className="text-neutral-7">
						{i18n.translate('no-results-found')}
					</p>
				}
				tabs={[]}
			/>
		);
	}

	const projectType =
		getSpecificationValue(application, 'license-term') ||
		getSpecificationValues(application, 'liferay-products-categories')[0] ||
		getSpecificationValue(application, 'price-model');

	const orderInfo = getProductOrderInfo(placedOrders, application.name);

	const detailsContent = (
		<DetailsCard
			rows={[
				{label: i18n.translate('order-id'), value: orderInfo.orderId},
				{
					label: i18n.translate('order-date'),
					value: orderInfo.orderDate,
				},
				{
					label: i18n.translate('purchased-by'),
					value: orderInfo.purchasedBy,
				},
				{
					label: i18n.translate('purchase-number'),
					value: orderInfo.purchaseNumber,
				},
				{
					label: i18n.translate('project-type'),
					value: projectType,
				},
				{
					label: i18n.translate('customer-account'),
					value: Liferay.CommerceContext.account?.accountName ?? '',
				},
			]}
		/>
	);

	const tabs: DetailTab[] = [
		{content: detailsContent, key: 'details', label: 'details'},
		{
			content: <ActivationKeysCard productName={application.name} />,
			key: 'activation',
			label: 'activation',
		},
		{
			content: (
				<DownloadListCard
					emptyLabel="no-versions-yet"
					heading="supported-version"
					items={bundles}
					title="versions-list"
				/>
			),
			key: 'download',
			label: 'download',
		},
		{
			content: (
				<HelpSupportCard
					specifications={application.productSpecifications}
				/>
			),
			key: 'help-and-support',
			label: 'help-and-support',
		},
	];

	return (
		<ProjectDetailTabs
			header={
				<DetailHeader
					logoColor={getLogoColor(application.name)}
					name={application.name}
					publisher={getSpecificationValue(
						application,
						'publisher-name'
					)}
					status="active"
				/>
			}
			tabs={tabs}
		/>
	);
}
