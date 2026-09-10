/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ReactNode} from 'react';
import {useParams} from 'react-router-dom';
import aiHubIconUrl from '~/assets/icons/ai_hub_icon.svg';
import Button from '~/components/Button/Button';
import {useProject} from '~/context/ProjectContext';
import {useDeliveryProduct} from '~/hooks/useDeliveryProduct';
import {
	getSpecificationValue,
	getSpecificationValues,
	useHasActiveExperienceOffering,
	useProjectCommerce,
} from '~/hooks/useProjectCommerce';
import {useProjectItems} from '~/hooks/useProjectItems';
import {
	getProductOrderInfo,
	getProductVirtualItems,
	useProjectOrders,
} from '~/hooks/useProjectOrders';
import i18n, {Word} from '~/i18n';
import AIHubAlert from '~/pages/MyAccount/Projects/components/AIHubAlert/AIHubAlert';
import ActivationTab from '~/pages/MyAccount/Projects/components/ActivationTab/ActivationTab';
import DetailHeader from '~/pages/MyAccount/Projects/components/DetailHeader/DetailHeader';
import DetailsTab from '~/pages/MyAccount/Projects/components/DetailsTab/DetailsTab';
import DownloadTab from '~/pages/MyAccount/Projects/components/DownloadTab/DownloadTab';
import EnvironmentTab from '~/pages/MyAccount/Projects/components/EnvironmentTab/EnvironmentTab';
import HelpSupportTab from '~/pages/MyAccount/Projects/components/HelpSupportTab/HelpSupportTab';
import OrdersTab from '~/pages/MyAccount/Projects/components/OrdersTab/OrdersTab';
import ProjectDetailTabs, {
	DetailTab,
} from '~/pages/MyAccount/Projects/components/ProjectDetailTabs/ProjectDetailTabs';
import UtilizationTab from '~/pages/MyAccount/Projects/components/UtilizationTab/UtilizationTab';
import {ProjectItemType, ProjectTabKey} from '~/pages/MyAccount/Projects/types';
import {PROJECT_TAB_LABELS} from '~/pages/MyAccount/Projects/utils/constants';
import {getLogoColor} from '~/pages/MyAccount/Projects/utils/getLogoColor';
import {getProductIcon} from '~/pages/MyAccount/Projects/utils/getProductIcon';
import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';
import {resolveProductTabConfig} from '~/pages/MyAccount/Projects/utils/resolveProductTabConfig';
import {Liferay} from '~/services/liferay/liferay';
import {getSiteURL} from '~/utils/siteUtils';

type ProjectItemDetailsProps = {
	itemType: ProjectItemType;
};

export default function ProjectItemDetails({
	itemType,
}: ProjectItemDetailsProps) {
	const {applicationERC, productERC} = useParams();
	const {project, projectId, selectedContractERC} = useProject();

	const itemERC = productERC ?? applicationERC ?? '';

	const projectName = isUnassignedProject(projectId)
		? undefined
		: project?.name;

	const {contract, loading: contractLoading} = useProjectCommerce(
		isUnassignedProject(projectId) ? '' : projectId,
		selectedContractERC
	);

	const {applications, loading: itemsLoading, products} = useProjectItems();

	const {hasActiveExperienceOffering, loading: experienceOfferingLoading} =
		useHasActiveExperienceOffering();

	const productId =
		(itemType === 'application' ? applications : products).find(
			(item) => item.externalReferenceCode === itemERC
		)?.id ?? '';

	const {data: product, isLoading} = useDeliveryProduct(productId);
	const {placedOrders} = useProjectOrders(projectName);

	const renderMessage = (word: Word) => (
		<ProjectDetailTabs
			header={<p className="text-neutral-7">{i18n.translate(word)}</p>}
			tabs={[]}
		/>
	);

	if (
		contractLoading ||
		experienceOfferingLoading ||
		isLoading ||
		itemsLoading
	) {
		return renderMessage('loading');
	}

	if (!product) {
		return renderMessage('no-results-found');
	}

	const iconCategory =
		getSpecificationValues(product, 'liferay-products-categories')[0] ??
		getSpecificationValue(product, 'price-model');

	const orderInfo = getProductOrderInfo(placedOrders, product.name);
	const virtualItems = getProductVirtualItems(placedOrders, product.name);

	const {
		activationProfile,
		detailsProfile,
		environmentProfile,
		learnUrl,
		tabKeys,
		utilizationProfile,
	} = resolveProductTabConfig({
		hasActiveExperienceOffering,
		itemType,
		product,
	});

	const tabContent: Record<ProjectTabKey, () => ReactNode> = {
		'activation': () => (
			<ActivationTab
				contract={contract}
				environmentProfile={environmentProfile}
				orderId={orderInfo.orderId}
				product={product}
				profile={activationProfile}
			/>
		),
		'details': () => (
			<DetailsTab
				contract={contract}
				orderInfo={orderInfo}
				profile={detailsProfile}
			/>
		),
		'download': () => (
			<DownloadTab itemType={itemType} virtualItems={virtualItems} />
		),
		'environment': () => (
			<EnvironmentTab
				environment={orderInfo.environment}
				profile={environmentProfile}
			/>
		),
		'help-and-support': () => (
			<HelpSupportTab learnUrl={learnUrl} product={product} />
		),
		'orders': () => <OrdersTab />,
		'utilization': () => (
			<UtilizationTab
				productExternalReferenceCode={itemERC}
				profile={utilizationProfile}
				projectExternalReferenceCode={projectId}
			/>
		),
	};

	const tabs: DetailTab[] = tabKeys.map((tabKey) => ({
		content: tabContent[tabKey],
		key: tabKey,
		label: PROJECT_TAB_LABELS[tabKey],
	}));

	const isAIHub = environmentProfile === 'ai-hub';

	return (
		<ProjectDetailTabs
			header={
				<DetailHeader
					actions={
						isAIHub && orderInfo.status === 'completed' ? (
							<Button
								displayType="primary"
								onClick={() =>
									Liferay.Util.navigate(
										`${getSiteURL()}/product-purchase?productId=${productId}&aiHubTokens#/`
									)
								}
							>
								{i18n.translate('buy-liferay-tokens')}
							</Button>
						) : undefined
					}
					banner={isAIHub ? <AIHubAlert /> : undefined}
					description={
						itemType === 'product' ? product.description : undefined
					}
					icon={
						itemType === 'product'
							? getProductIcon(iconCategory)
							: undefined
					}
					logoColor={getLogoColor(product.name)}
					logoSrc={isAIHub ? aiHubIconUrl : undefined}
					name={product.name}
					publisher={getSpecificationValue(product, 'publisher-name')}
					showByPrefix={itemType === 'product'}
					status={orderInfo.status || 'active'}
				/>
			}
			tabs={tabs}
		/>
	);
}
