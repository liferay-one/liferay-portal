/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import SubscriptionUpgrades from '~/services/spring-boot/SubscriptionUpgrades';

import type {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';

const useSubscriptionUpgradePricing = (
	accountId: number | string,
	projectExternalReferenceCode: string,
	type: SubscriptionUpgradeType
) =>
	useSWR(
		`/subscription-upgrades/pricing/${accountId}/${projectExternalReferenceCode}/${type}`,
		() =>
			SubscriptionUpgrades.getPricing({
				accountId,
				projectExternalReferenceCode,
				type,
			}),
		{revalidateOnFocus: false}
	);

export default useSubscriptionUpgradePricing;
