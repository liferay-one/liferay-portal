/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Loading from '~/components/Loading/Loading';
import CostBreakdown from '~/pages/ProductPurchase/SubscriptionUpgrade/components/CostBreakdown/CostBreakdown';
import {useSubscriptionUpgradeLayoutContext} from '~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeLayout/SubscriptionUpgradeLayout';
import SubscriptionUpgradeSummary from '~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeSummary/SubscriptionUpgradeSummary';
import useSubscriptionUpgradePricing from '~/pages/ProductPurchase/SubscriptionUpgrade/hooks/useSubscriptionUpgradePricing';
import SubscriptionUpgrades from '~/services/spring-boot/SubscriptionUpgrades';

const CMPAddOnSummary = () => {
	const {account, projectExternalReferenceCode, subscriptionUpgrade} =
		useSubscriptionUpgradeLayoutContext();

	const {data: pricing, isLoading} = useSubscriptionUpgradePricing(
		account.id,
		projectExternalReferenceCode,
		subscriptionUpgrade.type
	);

	if (isLoading) {
		return <Loading.Page />;
	}

	return (
		<SubscriptionUpgradeSummary
			disabled={!pricing}
			onConfirm={(billingAddress) =>
				SubscriptionUpgrades.postOrder({
					accountId: account.id,
					billingAddressId: billingAddress.id!,
					projectExternalReferenceCode,
					type: subscriptionUpgrade.type,
				})
			}
		>
			{pricing && <CostBreakdown pricing={pricing} />}
		</SubscriptionUpgradeSummary>
	);
};

export default CMPAddOnSummary;
