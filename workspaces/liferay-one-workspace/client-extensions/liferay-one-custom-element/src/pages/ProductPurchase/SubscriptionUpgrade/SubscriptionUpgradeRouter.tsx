/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {lazy} from 'react';
import {useRoutes} from 'react-router';
import EmptyState from '~/components/EmptyState/EmptyState';
import i18n from '~/i18n';
import {
	toStepItems,
	toStepRoutes,
} from '~/pages/ProductPurchase/productPurchaseRoutes';
import {toRouteObjects} from '~/utils/routeUtils';

import SubscriptionUpgradeLayout from './components/SubscriptionUpgradeLayout/SubscriptionUpgradeLayout';
import {getSubscriptionUpgradeSteps} from './subscriptionUpgradeRoutes';

import type {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';
import type {DeliveryProduct} from '~/types/product';

const OrderReceived = lazy(() => import('./OrderReceived/OrderReceived'));

type SubscriptionUpgradeRouterProps = {
	product: DeliveryProduct;
	type: SubscriptionUpgradeType;
};

const SubscriptionUpgradeRouter = ({
	product,
	type,
}: SubscriptionUpgradeRouterProps) => {
	const steps = getSubscriptionUpgradeSteps(type);

	const routes = useRoutes(
		toRouteObjects([
			{
				children: toStepRoutes(steps),
				element: (
					<SubscriptionUpgradeLayout
						product={product}
						steps={toStepItems(steps)}
						type={type}
					/>
				),
			},
			{
				element: (
					<div className={`subscription-upgrade-${type}`}>
						<OrderReceived product={product} />
					</div>
				),
				path: 'order-received',
			},
		])
	);

	if (!steps.length) {
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

	return routes;
};

export default SubscriptionUpgradeRouter;
