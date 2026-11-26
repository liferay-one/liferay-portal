/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Loading from '~/components/Loading/Loading';
import AIHubCostBreakdown from '~/pages/ProductPurchase/SubscriptionUpgrade/components/AIHubCostBreakdown/AIHubCostBreakdown';
import AIHubUpgradeUnavailable from '~/pages/ProductPurchase/SubscriptionUpgrade/components/AIHubUpgradeUnavailable/AIHubUpgradeUnavailable';
import {useSubscriptionUpgradeLayoutContext} from '~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeLayout/SubscriptionUpgradeLayout';
import SubscriptionUpgradeSummary from '~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeSummary/SubscriptionUpgradeSummary';
import useSubscriptionUpgradePricing from '~/pages/ProductPurchase/SubscriptionUpgrade/hooks/useSubscriptionUpgradePricing';
import SubscriptionUpgrades from '~/services/spring-boot/SubscriptionUpgrades';
import isAIHubStudioUpgrade from '~/utils/isAIHubStudioUpgrade';

import './AIHubTierSummary.css';

const AIHubTierSummary = () => {
	const {account, projectExternalReferenceCode, subscriptionUpgrade} =
		useSubscriptionUpgradeLayoutContext();

	const {
		data: pricing,
		error,
		isLoading,
	} = useSubscriptionUpgradePricing(
		account.id,
		projectExternalReferenceCode,
		subscriptionUpgrade.type
	);

	if (isLoading) {
		return <Loading.Page />;
	}

	const tierChange = pricing?.tierChange;

	if (
		error ||
		!pricing ||
		!tierChange ||
		!isAIHubStudioUpgrade(subscriptionUpgrade)
	) {
		return <AIHubUpgradeUnavailable error={error} />;
	}

	return (
		<SubscriptionUpgradeSummary
			confirmPurchaseModalClassName="ai-hub-confirm-purchase-modal"
			onConfirm={(billingAddress) =>
				SubscriptionUpgrades.postOrder({
					accountId: account.id,
					billingAddressId: billingAddress.id!,
					projectExternalReferenceCode,
					type: subscriptionUpgrade.type,
				})
			}
		>
			<AIHubCostBreakdown pricing={pricing} tierChange={tierChange} />
		</SubscriptionUpgradeSummary>
	);
};

export default AIHubTierSummary;
