/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ReactNode} from 'react';
import {useParams} from 'react-router-dom';

import {useProject} from '../../../context/ProjectContext';
import {useLiferayBundles} from '../../../hooks/data/useLiferayBundles';
import {useDeliveryProduct} from '../../../hooks/data/useProduct';
import {
	getSpecificationValue,
	getSpecificationValues,
	useProjectProducts,
} from '../../../hooks/data/useProjectCommerce';
import {
	getProductOrderInfo,
	useProjectOrders,
} from '../../../hooks/data/useProjectOrders';
import i18n from '../../../i18n';
import {Liferay} from '../../../liferay/liferay';
import ActivationKeysCard from './ActivationKeysCard';
import DetailHeader from './DetailHeader';
import DetailsCard, {DetailsRow} from './DetailsCard';
import DownloadListCard from './DownloadListCard';
import EnvironmentCard from './EnvironmentCard';
import HelpSupportCard from './HelpSupportCard';
import OrdersCard from './OrdersCard';
import ProjectDetailTabs, {DetailTab} from './ProjectDetailTabs';
import UtilizationCard from './UtilizationCard';
import {
	PROJECT_TAB_LABELS,
	ProjectItemKind,
	ProjectTabKey,
	getVisibleProjectTabKeys,
} from './projectItemTabs';
import {isUnassignedProject} from './projects';
import {getLogoColor, getProductIcon} from './visuals';

type ProjectItemDetailsProps = {
	kind: ProjectItemKind;
};

export default function ProjectItemDetails({kind}: ProjectItemDetailsProps) {
	const {applicationERC, productERC} = useParams();
	const {projectId, projects} = useProject();

	const itemERC = productERC ?? applicationERC ?? '';

	const projectName = isUnassignedProject(projectId)
		? undefined
		: projects.find(
				(project) => project.externalReferenceCode === projectId
			)?.name;

	// The URL carries the product external reference code, but the delivery
	// catalog only resolves a product by its id, so map the ERC through the
	// project's products before fetching the full product.

	const {loading: productsLoading, products} = useProjectProducts(projectId);

	const productId =
		products.find((product) => product.externalReferenceCode === itemERC)
			?.id ?? '';

	const {data: product, isLoading} = useDeliveryProduct(productId);
	const {placedOrders} = useProjectOrders(projectName);
	const {bundles} = useLiferayBundles();

	if (productsLoading || isLoading) {
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

	const detailsRows: DetailsRow[] = [
		...(kind === 'product'
			? [{label: i18n.translate('type'), value: type}]
			: []),
		{label: i18n.translate('order-id'), value: orderInfo.orderId},
		{label: i18n.translate('order-date'), value: orderInfo.orderDate},
		{label: i18n.translate('purchased-by'), value: orderInfo.purchasedBy},
		{
			label: i18n.translate('purchase-number'),
			value: orderInfo.purchaseNumber,
		},
		...(kind === 'application'
			? [
					{
						label: i18n.translate('project-type'),
						value:
							getSpecificationValue(product, 'license-term') ||
							type,
					},
				]
			: []),
		{
			label: i18n.translate('customer-account'),
			value: Liferay.CommerceContext.account?.accountName ?? '',
		},
	];

	const tabContent: Record<ProjectTabKey, ReactNode> = {
		'activation': <ActivationKeysCard productName={product.name} />,
		'details': <DetailsCard rows={detailsRows} />,
		'download': (
			<DownloadListCard
				emptyLabel={
					kind === 'product' ? 'no-bundles-yet' : 'no-versions-yet'
				}
				heading={
					kind === 'product' ? 'bundle-name' : 'supported-version'
				}
				items={bundles}
				title={kind === 'product' ? 'bundle-list' : 'versions-list'}
			/>
		),
		'environment': <EnvironmentCard environment={orderInfo.environment} />,
		'help-and-support': (
			<HelpSupportCard specifications={product.productSpecifications} />
		),
		'orders': <OrdersCard />,
		'utilization': <UtilizationCard />,
	};

	const tabs: DetailTab[] = getVisibleProjectTabKeys({
		kind,
		orderType: orderInfo.orderType,
		product,
	}).map((tabKey) => ({
		content: tabContent[tabKey],
		key: tabKey,
		label: PROJECT_TAB_LABELS[tabKey],
	}));

	return (
		<ProjectDetailTabs
			header={
				<DetailHeader
					description={
						kind === 'product' ? product.description : undefined
					}
					icon={kind === 'product' ? getProductIcon(type) : undefined}
					logoColor={getLogoColor(product.name)}
					name={product.name}
					publisher={getSpecificationValue(product, 'publisher-name')}
					showByPrefix={kind === 'product'}
					status="active"
				/>
			}
			tabs={tabs}
		/>
	);
}
