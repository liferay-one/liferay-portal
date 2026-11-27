/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayIcon from '@clayui/icon';
import {Outlet, useLocation, useNavigate, useOutletContext} from 'react-router';
import useSWR from 'swr';
import AccountAvatar from '~/components/AccountAvatar/AccountAvatar';
import EmptyState from '~/components/EmptyState/EmptyState';
import Loading from '~/components/Loading/Loading';
import {useSubscriptionUpgrades} from '~/hooks/useSubscriptionUpgrades';
import i18n from '~/i18n';
import ProductPurchaseHeader from '~/pages/ProductPurchase/components/ProductPurchaseHeader/ProductPurchaseHeader';
import ProductPurchaseSteps from '~/pages/ProductPurchase/components/ProductPurchaseSteps/ProductPurchaseSteps';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {queryGraphQL, toGraphQLString} from '~/services/graphql/GraphQL';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {Liferay} from '~/services/liferay/liferay';
import {getLicenseTagText} from '~/utils/productUtils';
import {getSiteURL} from '~/utils/siteUtils';

import type {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';
import type {ProductPurchaseStepItem} from '~/pages/ProductPurchase/productPurchaseRoutes';
import type {Account} from '~/types/accounts';
import type {APIResponse} from '~/types/api';
import type {DeliveryProduct} from '~/types/product';
import type {SubscriptionUpgrade} from '~/types/subscriptionUpgrade';

type SubscriptionUpgradeLayoutProps = {
	product: DeliveryProduct;
	steps: ProductPurchaseStepItem[];
	type: SubscriptionUpgradeType;
};

export type SubscriptionUpgradeLayoutContext = {
	account: Account;
	actions: {
		exit: () => void;
		nextStep: () => void;
		previousStep: () => void;
	};
	product: DeliveryProduct;
	projectExternalReferenceCode: string;
	subscriptionUpgrade: SubscriptionUpgrade;
};

const SubscriptionUpgradeLayout = ({
	product,
	steps: stepItems,
	type,
}: SubscriptionUpgradeLayoutProps) => {
	const accountId = Liferay.CommerceContext.account?.accountId;

	const projectExternalReferenceCode =
		new URLSearchParams(window.location.search).get(
			'projectExternalReferenceCode'
		) ?? '';

	const {data: account, isLoading: isAccountLoading} = useSWR(
		accountId ? `/account/${accountId}` : null,
		() => HeadlessAdminUser.getAccount(accountId!)
	);

	const {data: projectName} = useSWR(
		projectExternalReferenceCode
			? `/graphql/project-name/${projectExternalReferenceCode}`
			: null,
		() =>
			queryGraphQL<{projects: APIResponse<{name: string}>}>(
				`c { projects(filter: ${toGraphQLString(
					SearchBuilder.eq(
						'externalReferenceCode',
						projectExternalReferenceCode
					)
				)}, pageSize: 1) { items { name } } }`
			).then((data) => data.projects.items[0]?.name)
	);

	const {
		data: subscriptionUpgrades,
		isLoading: isSubscriptionUpgradesLoading,
	} = useSubscriptionUpgrades(accountId, projectExternalReferenceCode);

	const {pathname} = useLocation();

	const navigate = useNavigate();

	if (isAccountLoading || isSubscriptionUpgradesLoading) {
		return <Loading.Page />;
	}

	const subscriptionUpgrade = subscriptionUpgrades?.find(
		(subscriptionUpgrade) => subscriptionUpgrade.type === type
	);

	if (!account || !subscriptionUpgrade) {
		return (
			<EmptyState
				description={i18n.translate(
					'this-upgrade-is-not-available-for-the-selected-project'
				)}
				title={i18n.translate('upgrade-unavailable')}
				type="NOT_FOUND"
			/>
		);
	}

	const exit = () =>
		Liferay.Util.navigate(
			`${getSiteURL()}/my-account/#/project/${encodeURIComponent(projectExternalReferenceCode)}/products/${encodeURIComponent(subscriptionUpgrade.productExternalReferenceCode)}`
		);

	const steps = stepItems.map((stepItem) => ({
		active: pathname === stepItem.key,
		key: stepItem.key,
		title: stepItem.title,
	}));

	const activeStepIndex = steps.findIndex(({active}) => active);

	const stepNavigate = (stepNumber: number) => {
		const step = steps[activeStepIndex + stepNumber];

		if (step) {
			navigate(step.key);

			return;
		}

		if (stepNumber < 0) {
			exit();
		}
	};

	const sku =
		product.skus?.find(
			(sku) =>
				sku?.externalReferenceCode ===
				subscriptionUpgrade.targetSkuExternalReferenceCode
		) ?? product.skus?.[0];

	const context: SubscriptionUpgradeLayoutContext = {
		account,
		actions: {
			exit,
			nextStep: () => stepNavigate(1),
			previousStep: () => stepNavigate(-1),
		},
		product,
		projectExternalReferenceCode,
		subscriptionUpgrade,
	};

	const renderGoBackButton = (className: string) => (
		<ClayButton
			className={`font-weight-semi-bold subscription-upgrade-go-back ${className}`}
			displayType="unstyled"
			onClick={exit}
		>
			<ClayIcon className="mr-2" symbol="order-arrow-left" />

			{i18n.translate('go-back')}
		</ClayButton>
	);

	if (stepItems[activeStepIndex]?.standalone) {
		return (
			<div className="subscription-upgrade-standalone">
				<div className="container-fluid container-fluid-max-xl">
					{renderGoBackButton(
						'subscription-upgrade-standalone-go-back'
					)}
				</div>

				<Outlet context={context} />
			</div>
		);
	}

	return (
		<div className={`subscription-upgrade-${type}`}>
			{renderGoBackButton('mb-4')}

			<ProductPurchaseHeader
				product={product}
				rightNode={
					sku?.price?.priceFormatted && (
						<div className="text-right">
							<small className="d-block text-muted text-nowrap">
								{i18n.translate('price')}
							</small>

							<div className="d-flex flex-column">
								<span className="font-weight-semi-bold text-nowrap">
									{sku.price.priceFormatted}
								</span>

								<span className="badge badge-primary m-0">
									{getLicenseTagText(product)}
								</span>
							</div>
						</div>
					)
				}
			>
				<hr className="mx-n4 my-4" />

				<div className="align-items-center d-flex justify-content-between">
					<span className="font-weight-semi-bold subscription-upgrade-header-label text-muted">
						{i18n.translate('account-selected')}
					</span>

					<div className="align-items-center d-flex">
						<div className="mr-3 text-right">
							<strong className="d-block subscription-upgrade-header-account-name">
								{account.name}
							</strong>

							<small className="subscription-upgrade-header-account-email text-muted">
								{Liferay.ThemeDisplay.getUserEmailAddress()}
							</small>
						</div>

						<AccountAvatar
							logoURL={account.logoURL}
							type={account.type}
						/>
					</div>
				</div>

				{projectName && (
					<div className="align-items-center d-flex justify-content-between mt-3">
						<span className="font-weight-semi-bold subscription-upgrade-header-label text-muted">
							{i18n.translate('project-selected')}
						</span>

						<strong className="subscription-upgrade-header-project-name">
							{projectName}
						</strong>
					</div>
				)}
			</ProductPurchaseHeader>

			<div className="bg-white border d-flex flex-column mt-4 p-4 pt-5 rounded subscription-upgrade-content">
				<ProductPurchaseSteps
					className="mb-4"
					steps={steps.filter(
						(_, index) => !stepItems[index].standalone
					)}
				/>

				<Outlet context={context} />
			</div>
		</div>
	);
};

const useSubscriptionUpgradeLayoutContext = () =>
	useOutletContext<SubscriptionUpgradeLayoutContext>();

export {useSubscriptionUpgradeLayoutContext};

export default SubscriptionUpgradeLayout;
