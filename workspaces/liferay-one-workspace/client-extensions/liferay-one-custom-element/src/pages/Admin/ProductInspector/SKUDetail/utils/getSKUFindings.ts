/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {ProductFinding} from '../../utils/getProductFindings';

function getSKUFindings(
	productFindings: ProductFinding[],
	skuId: number,
	entitlementDefinitionIds: Set<number>
): ProductFinding[] {
	return productFindings.flatMap((finding) => {
		const {collection, ids} = finding;

		if (collection !== 'entitlementDefinitions' && collection !== 'skus') {
			return [];
		}

		if (!ids.length) {
			return [finding];
		}

		const matchingIds = ids.filter((id) =>
			collection === 'skus'
				? id === skuId
				: entitlementDefinitionIds.has(Number(id))
		);

		return matchingIds.length ? [{...finding, ids: matchingIds}] : [];
	});
}

export default getSKUFindings;
