/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import Cloud, {
	CloudEnvironmentSubscription,
} from '~/services/spring-boot/Cloud';

const NONE: CloudEnvironmentSubscription[] = [];

export function useEnvironmentSubscriptions(environmentId?: string) {
	const {data, error, isLoading} = useSWR(
		environmentId
			? `/cloud/environments/${environmentId}/entitlements`
			: null,
		() => Cloud.getEnvironmentsEntitlements(environmentId as string)
	);

	return {
		error,
		loading: isLoading,
		subscriptions: data?.subscriptions ?? NONE,
	};
}

export default useEnvironmentSubscriptions;
