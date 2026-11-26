/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Loading from '~/components/Loading/Loading';
import i18n from '~/i18n';
import {useAIHubRequirementsModal} from '~/pages/ProductPurchase/SubscriptionUpgrade/AIHubPlanSelection/hooks/useAIHubRequirementsModal';
import AIHubUpgradeUnavailable from '~/pages/ProductPurchase/SubscriptionUpgrade/components/AIHubUpgradeUnavailable/AIHubUpgradeUnavailable';
import SubscriptionPlanCard from '~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionPlanCard/SubscriptionPlanCard';
import {useSubscriptionUpgradeLayoutContext} from '~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeLayout/SubscriptionUpgradeLayout';
import useSubscriptionUpgradePricing from '~/pages/ProductPurchase/SubscriptionUpgrade/hooks/useSubscriptionUpgradePricing';
import {Liferay} from '~/services/liferay/liferay';
import {formatCurrency} from '~/utils/formatCurrency';
import isAIHubStudioUpgrade from '~/utils/isAIHubStudioUpgrade';

import './AIHubPlanSelection.css';

import type {Word} from '~/i18n';

const ACTIVATE_FEATURES: Word[] = [
	'otb-liferay-agents',
	'up-to-5-customized-agents-modified-otb',
	'200mb-data-source-capacity-500-4000-pages',
	'basic-access-control-standard-liferay-roles',
	'audit-trail-6-months',
	'10-simultaneous-agent-requests',
];

const STUDIO_FEATURES: Word[] = [
	'everything-in-activate-plus',
	'up-to-25-custom-agents-built-from-scratch',
	'bring-your-own-llm',
	'connectors-to-external-systems-10-included',
	'1gb-data-source-capacity-2500-20000-pages',
	'25-simultaneous-agent-requests',
];

const AIHubPlanSelection = () => {
	const {
		account,
		actions: {nextStep},
		projectExternalReferenceCode,
		subscriptionUpgrade,
	} = useSubscriptionUpgradeLayoutContext();

	const aiHubRequirementsModal = useAIHubRequirementsModal();

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
		<div className="ai-hub-plan-selection">
			<h1 className="ai-hub-plan-selection-title text-center">
				{i18n.translate('choose-the-perfect-plan-for-your-needs')}
			</h1>

			<div className="ai-hub-plan-selection-cards">
				<SubscriptionPlanCard
					current
					description="ai-hub-activate-plan-description"
					features={ACTIVATE_FEATURES}
					name="activate"
					price={i18n.translate('no-change')}
				/>

				<SubscriptionPlanCard
					description="ai-hub-studio-plan-description"
					features={STUDIO_FEATURES}
					name="studio"
					onPurchase={() =>
						aiHubRequirementsModal.openModal(nextStep)
					}
					price={`+ ${formatCurrency(
						tierChange.monthlyPriceDifference,
						pricing.currencyCode,
						Liferay.ThemeDisplay.getBCP47LanguageId()
					)}`}
					priceSuffix={i18n.translate('per-month')}
				/>
			</div>
		</div>
	);
};

export default AIHubPlanSelection;
