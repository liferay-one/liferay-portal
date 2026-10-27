/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ProjectActivationKey} from '~/hooks/useProjectActivationKeys';

import {isPermanentKey} from './isPermanentKey';

const FREE_KEY_RENEWAL_THRESHOLD_DAYS = 90;

const FREE_KEY_TYPE = 'free';

function isInFreeKeyRenewalWindow(expirationDate?: string): boolean {
	if (!expirationDate) {
		return false;
	}

	const renewalStart = new Date(expirationDate);

	if (Number.isNaN(renewalStart.getTime())) {
		return false;
	}

	renewalStart.setDate(
		renewalStart.getDate() - FREE_KEY_RENEWAL_THRESHOLD_DAYS
	);

	return renewalStart <= new Date();
}

export function isRenewableKey(
	activationKey: ProjectActivationKey,
	canRenewVirtualCluster = false,
	unassigned = false
): boolean {
	const free = activationKey.type === FREE_KEY_TYPE;

	if (
		(unassigned && (!free || activationKey.projectExternalReferenceCode)) ||
		(free && !isInFreeKeyRenewalWindow(activationKey.expirationDateValue))
	) {
		return false;
	}

	return (
		!activationKey.unaggregated &&
		(canRenewVirtualCluster || activationKey.type !== 'virtual-cluster') &&
		!isPermanentKey(
			activationKey.expirationDateValue,
			activationKey.startDateValue
		)
	);
}

export default isRenewableKey;
