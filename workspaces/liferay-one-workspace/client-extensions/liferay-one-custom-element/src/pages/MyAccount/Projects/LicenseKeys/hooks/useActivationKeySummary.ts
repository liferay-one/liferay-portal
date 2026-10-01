/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useDataQuery} from '~/hooks/useDataQuery';
import ActivationKeys, {
	ActivationKeySummary,
} from '~/services/spring-boot/ActivationKeys';

export function useActivationKeySummary(
	projectExternalReferenceCode: string,
	enabled = true
) {
	const {data, error, isLoading} = useDataQuery<ActivationKeySummary>({
		fetcher: () => ActivationKeys.getSummary(projectExternalReferenceCode),
		key:
			enabled && projectExternalReferenceCode
				? `/activation-keys/summary/${projectExternalReferenceCode}`
				: null,
	});

	return {error, loading: isLoading, summary: data};
}

export default useActivationKeySummary;
