/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useDataQuery} from '~/hooks/useDataQuery';
import ActivationKeys, {
	ActivationKeyScope,
	ActivationKeySummary,
} from '~/services/spring-boot/ActivationKeys';

export function useActivationKeySummary(
	scope?: ActivationKeyScope,
	enabled = true
) {
	const {data, error, isLoading} = useDataQuery<ActivationKeySummary>({
		fetcher: () =>
			scope
				? ActivationKeys.getSummary(scope)
				: Promise.reject(new Error('No activation key scope')),
		key:
			enabled && scope
				? `/activation-keys/summary?${new URLSearchParams(scope)}`
				: null,
	});

	return {error, loading: isLoading, summary: data};
}

export default useActivationKeySummary;
