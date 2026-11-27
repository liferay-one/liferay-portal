/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import SubscriptionUpgrades from '~/services/spring-boot/SubscriptionUpgrades';

export function useSubscriptionUpgrades(
	accountId?: number | string | null,
	projectExternalReferenceCode?: string
) {
	return useSWR(
		accountId && projectExternalReferenceCode
			? `/subscription-upgrades/${accountId}/${projectExternalReferenceCode}`
			: null,
		() =>
			SubscriptionUpgrades.getSubscriptionUpgrades({
				accountId: accountId!,
				projectExternalReferenceCode: projectExternalReferenceCode!,
			})
	);
}

export default useSubscriptionUpgrades;
