/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayIcon from '@clayui/icon';
import {ReactNode} from 'react';
import safetyComplianceIconUrl from '~/assets/icons/safety_compliance.svg';
import {useAccount} from '~/context/AccountContext';
import {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';
import {useSubscriptionUpgrades} from '~/hooks/useSubscriptionUpgrades';
import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import isAIHubStudioUpgrade from '~/utils/isAIHubStudioUpgrade';
import {getSiteURL} from '~/utils/siteUtils';

import './AIHubUpgradeCard.css';

type AIHubUpgradeCardProps = {
	children: ReactNode;
	productExternalReferenceCode: string;
	projectExternalReferenceCode: string;
};

export default function AIHubUpgradeCard({
	children,
	productExternalReferenceCode,
	projectExternalReferenceCode,
}: AIHubUpgradeCardProps) {
	const {account} = useAccount();

	const {data: subscriptionUpgrades} = useSubscriptionUpgrades(
		account?.id,
		projectExternalReferenceCode
	);

	const subscriptionUpgrade = subscriptionUpgrades?.find(
		(subscriptionUpgrade) =>
			subscriptionUpgrade.productExternalReferenceCode ===
				productExternalReferenceCode &&
			isAIHubStudioUpgrade(subscriptionUpgrade)
	);

	if (!subscriptionUpgrade) {
		return <>{children}</>;
	}

	const upgradeURL = `${getSiteURL()}/product-purchase?${new URLSearchParams({
		productId: String(subscriptionUpgrade.targetProductId),
		projectExternalReferenceCode,
		upgradeType: SubscriptionUpgradeType.AI_HUB_TIER,
	})}#/`;

	return (
		<div className="no-gutters row">
			<div className="col-lg pr-lg-4">{children}</div>

			<div className="col-lg">
				<div className="ai-hub-upgrade-card d-flex mt-3 p-4 rounded">
					<img
						alt=""
						className="mr-3"
						draggable="false"
						height={32}
						src={safetyComplianceIconUrl}
						width={32}
					/>

					<div>
						<h3 className="h5 mb-1">
							{i18n.translate('move-to-studio')}
						</h3>

						<p className="mb-2 text-secondary">
							{i18n.translate(
								'take-full-control-of-your-ai-capabilities-build-custom-agents-and-connect-your-own-llm-models'
							)}
						</p>

						<ClayButton
							className="font-weight-semi-bold p-0"
							displayType="link"
							onClick={() => Liferay.Util.navigate(upgradeURL)}
						>
							{i18n.translate('upgrade-now')}

							<ClayIcon
								className="ml-2"
								symbol="order-arrow-right"
							/>
						</ClayButton>
					</div>
				</div>
			</div>
		</div>
	);
}
