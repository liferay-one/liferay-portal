/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ProjectActivationKey} from '~/hooks/useProjectActivationKeys';

export function isDownloadableKey(activationKey: ProjectActivationKey) {
	return activationKey.active && activationKey.status !== 'expired';
}

export default isDownloadableKey;
