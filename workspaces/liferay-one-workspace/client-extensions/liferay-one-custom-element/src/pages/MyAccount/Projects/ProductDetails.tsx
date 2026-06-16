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
import OrdersCard from './OrdersCard';
import ProjectDetailTabs, {DetailTab} from './ProjectDetailTabs';
import {getLogoColor, getProductIcon} from './visuals';

export default function ProductDetails() {
	const {productId} = useParams();
	const {projectId, projects} = useProject();

	const projectName = projects.find(
		(project) => project.externalReferenceCode === projectId
	)?.name;

	const {data: product, isLoading} = useDeliveryProduct(productId ?? '');
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

	if (!product) {
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

	const type =
		getSpecificationValues(product, 'liferay-products-categories')[0] ??
		getSpecificationValue(product, 'price-model');

	const orderInfo = getProductOrderInfo(placedOrders, product.name);

	const detailsContent = (
		<DetailsCard
			rows={[
				{label: i18n.translate('type'), value: type},
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
					label: i18n.translate('customer-account'),
					value: Liferay.CommerceContext.account?.accountName ?? '',
				},
			]}
		/>
	);

	const tabs: DetailTab[] = [
		{content: detailsContent, key: 'details', label: 'details'},
		{
			content: <ActivationKeysCard productName={product.name} />,
			key: 'activation',
			label: 'activation',
		},
		{
			content: (
				<DownloadListCard
					emptyLabel="no-bundles-yet"
					heading="bundle-name"
					items={bundles}
					title="bundle-list"
				/>
			),
			key: 'download',
			label: 'download',
		},
		{content: <OrdersCard />, key: 'orders', label: 'orders'},
	];

	return (
		<ProjectDetailTabs
			header={
				<DetailHeader
					description={product.description}
					icon={getProductIcon(type)}
					logoColor={getLogoColor(product.name)}
					name={product.name}
					publisher={getSpecificationValue(product, 'publisher-name')}
					showByPrefix
					status="active"
				/>
			}
			tabs={tabs}
		/>
	);
}
