/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {isUnassignedProject} from './isUnassignedProject';

import type {ActivationKeyScope} from '~/services/spring-boot/ActivationKeys';

export function toActivationKeyScope(
	accountExternalReferenceCode?: string,
	projectExternalReferenceCode?: string
): ActivationKeyScope | undefined {
	if (!projectExternalReferenceCode) {
		return undefined;
	}

	if (isUnassignedProject(projectExternalReferenceCode)) {
		return accountExternalReferenceCode
			? {accountExternalReferenceCode}
			: undefined;
	}

	return {projectExternalReferenceCode};
}

export default toActivationKeyScope;
