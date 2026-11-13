/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useActivationKeyScope} from '~/pages/MyAccount/Projects/LicenseKeys/hooks/useActivationKeyScope';
import {useActivationKeySummary} from '~/pages/MyAccount/Projects/LicenseKeys/hooks/useActivationKeySummary';
import {useCanRenewVirtualCluster} from '~/pages/MyAccount/Projects/hooks/useCanRenewVirtualCluster';

import type {RenewableKeyOptions} from '~/pages/MyAccount/Projects/utils/isRenewableKey';

export function useRenewableKeyOptions(enabled = true): RenewableKeyOptions {
	const canRenewVirtualCluster = useCanRenewVirtualCluster();
	const scope = useActivationKeyScope();

	const {summary} = useActivationKeySummary(scope, enabled);

	return useMemo(
		() => ({
			canRenewVirtualCluster,
			restrictedKeyTypes: summary?.restrictedKeyTypes ?? [],
		}),
		[canRenewVirtualCluster, summary]
	);
}

export default useRenewableKeyOptions;
