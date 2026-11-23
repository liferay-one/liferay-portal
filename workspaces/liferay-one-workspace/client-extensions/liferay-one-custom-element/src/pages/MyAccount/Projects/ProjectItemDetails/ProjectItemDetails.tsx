/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ReactNode} from 'react';
import {useParams} from 'react-router';
import aiHubIconUrl from '~/assets/icons/ai_hub_icon.svg';
import Button from '~/components/Button/Button';
import Loading from '~/components/Loading/Loading';
import {useProject} from '~/context/ProjectContext';
import {
	useActiveSkuExternalReferenceCodes,
	useHasActiveExperienceOffering,
	useProjectCommerce,
	useProjectProducts,
} from '~/hooks/useProjectCommerce';
import {useProjectEnvironments} from '~/hooks/useProjectEnvironments';
import {useProjectItems} from '~/hooks/useProjectItems';
import {
	getProductEnvironmentOrderItems,
	getProductOrder,
	getProductOrderInfo,
	getProductVirtualItems,
	hasActiveProductOrder,
	hasProject,
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
import SEOStudioDetails from '~/pages/MyAccount/Projects/components/ProductDetails/SEOStudioDetails';
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
import {
	getAIHubEnvironmentExternalReferenceCode,
	isProvisionedAIHubEnvironment,
} from '~/utils/aiHubEnvironmentUtils';
import {getContractProductOrders} from '~/utils/orderUtils';
import {
	getProductPublisherName,
	getProductSpecificationValue,
	getProductSpecificationValues,
	isDXPFreeTierProduct,
} from '~/utils/productUtils';
import {getSiteURL} from '~/utils/siteUtils';

type ProjectItemDetailsProps = {
	itemType: ProjectItemType;
};

export default function ProjectItemDetails({
	itemType,
}: ProjectItemDetailsProps) {
	const {accountERC, applicationERC, productERC} = useParams();
	const {project, projectId, selectedContractERC} = useProject();

	const itemERC = productERC ?? applicationERC ?? '';

	const orderProject = isUnassignedProject(projectId) ? undefined : project;

	const {
		contract,
		loading: contractLoading,
		resolvedContractId,
	} = useProjectCommerce(
		isUnassignedProject(projectId) ? '' : projectId,
		selectedContractERC
	);

	const {applications, loading: itemsLoading, products} = useProjectItems();

	const {hasActiveExperienceOffering, loading: experienceOfferingLoading} =
		useHasActiveExperienceOffering();

	const {
		activeSkuExternalReferenceCodesByProduct,
		loading: activeProductsLoading,
	} = useActiveSkuExternalReferenceCodes();

	const productId =
		(itemType === 'application' ? applications : products).find(
			(item) => item.externalReferenceCode === itemERC
		)?.id ?? '';

	const {data: projectProducts, isLoading} = useProjectProducts();

	const product = projectProducts?.items.find(
		(projectProduct) => String(projectProduct.productId) === productId
	);

	const {loading: ordersLoading, placedOrders} =
		useProjectOrders(orderProject);

	const {environments} = useProjectEnvironments();

	const renderMessage = (word: Word) => (
		<ProjectDetailTabs
			header={<p className="text-neutral-7">{i18n.translate(word)}</p>}
			tabs={[]}
		/>
	);

	if (
		activeProductsLoading ||
		contractLoading ||
		experienceOfferingLoading ||
		isLoading ||
		itemsLoading ||
		ordersLoading
	) {
		return <Loading.Page />;
	}

	if (!product) {
		return renderMessage('no-results-found');
	}

	const iconCategory =
		getProductSpecificationValues(
			'liferay-product-categories',
			product
		)[0] ?? getProductSpecificationValue('price-model', product);

	const productOrders = getContractProductOrders(
		placedOrders,
		product.productId,
		resolvedContractId
	);

	const productOrder = getProductOrder(productOrders, product.productId);

	const orderInfo = getProductOrderInfo(
		itemType,
		productOrders,
		product.productId,
		resolvedContractId
	);
	const virtualItems = getProductVirtualItems(
		productOrders,
		product.productId
	);

	const {
		activationProfile,
		detailsProfile,
		downloadProfile,
		environmentProfile,
		learnUrl,
		tabKeys,
		utilizationProfile,
	} = resolveProductTabConfig({
		activeSkuExternalReferenceCodes:
			activeSkuExternalReferenceCodesByProduct.get(
				product.externalReferenceCode
			) ?? [],
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
		'details': () => {
			if (orderInfo.orderType === 'SEO_STUDIO') {
				return <SEOStudioDetails placedOrder={productOrder} />;
			}

			return (
				<DetailsTab
					contract={contract}
					itemType={itemType}
					orderInfo={orderInfo}
					orderItems={getProductEnvironmentOrderItems(
						productOrders,
						product.productId
					)}
					productName={product.name}
					profile={detailsProfile}
				/>
			);
		},
		'download': () => (
			<DownloadTab
				freeTier={isDXPFreeTierProduct(product)}
				profile={downloadProfile}
				virtualItems={virtualItems}
			/>
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
		'orders': () => <OrdersTab productId={product.productId} />,
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
						isAIHub &&
						environments.some(
							(environment) =>
								environment.externalReferenceCode ===
									getAIHubEnvironmentExternalReferenceCode(
										(isUnassignedProject(projectId)
											? accountERC
											: projectId) ?? ''
									) &&
								isProvisionedAIHubEnvironment(environment)
						) &&
						hasActiveProductOrder(
							isUnassignedProject(projectId)
								? productOrders.filter(
										(order) => !hasProject(order)
									)
								: productOrders,
							product.productId
						) ? (
							<Button
								displayType="primary"
								onClick={() =>
									Liferay.Util.navigate(
										`${getSiteURL()}/product-purchase?productId=${product.productId}${isUnassignedProject(projectId) ? '' : `&projectExternalReferenceCode=${encodeURIComponent(projectId)}`}&aiHubTokens#/`
									)
								}
							>
								{i18n.translate('buy-liferay-tokens')}
							</Button>
						) : undefined
					}
					banner={isAIHub ? <AIHubAlert /> : undefined}
					icon={
						itemType === 'product'
							? getProductIcon(iconCategory)
							: undefined
					}
					logoColor={getLogoColor(product.name)}
					logoSrc={isAIHub ? aiHubIconUrl : undefined}
					name={product.name}
					publisher={getProductPublisherName(product)}
					showByPrefix={itemType === 'product' && !isAIHub}
					status={orderInfo.status || 'active'}
				/>
			}
			tabs={tabs}
		/>
	);
}
