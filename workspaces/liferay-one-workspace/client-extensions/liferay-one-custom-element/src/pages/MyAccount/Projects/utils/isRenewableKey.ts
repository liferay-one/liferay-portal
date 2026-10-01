/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ProjectActivationKey} from '~/hooks/useProjectActivationKeys';

import {isPermanentKey} from './isPermanentKey';

export function isRenewableKey(
	activationKey: ProjectActivationKey,
	admin = false
): boolean {
	return (
		!activationKey.unaggregated &&
		(admin || activationKey.type !== 'virtual-cluster') &&
		!isPermanentKey(
			activationKey.expirationDateValue,
			activationKey.startDateValue
		)
	);
}

export default isRenewableKey;
