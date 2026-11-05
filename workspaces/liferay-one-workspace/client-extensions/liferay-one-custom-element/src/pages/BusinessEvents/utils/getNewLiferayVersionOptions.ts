/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {IOption} from '~/pages/BusinessEvents/components/Select/Select';

export default function getNewLiferayVersionOptions(
	productVersions: IOption[],
	currentLiferayVersionKey?: number | string
): IOption[] {
	if (!currentLiferayVersionKey) {
		return [...productVersions];
	}

	const currentIndex = productVersions.findIndex(
		(productVersion) => productVersion.value === currentLiferayVersionKey
	);

	return productVersions.slice(0, currentIndex + 1);
}
