/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {sortFindings, toFinding} from './productCatalogUtils';

import type {
	EntitlementDefinitionCollectionKey,
	InspectedEntitlementDefinition,
	InspectorFinding,
} from '~/types/productInspection';

import type {CatalogIndex} from './productCatalogUtils';

export type EntitlementDefinitionFinding =
	InspectorFinding<EntitlementDefinitionCollectionKey>;

function getEntitlementDefinitionFindings(
	entitlementDefinition: InspectedEntitlementDefinition,
	{
		entitlementDefinitionsBySKU,
		productsBySKU,
		usageDefinitionIds,
	}: CatalogIndex
): EntitlementDefinitionFinding[] {
	const {
		active,
		generatesActivationKey,
		id,
		licenseKeyFamily,
		overageRate,
		overageSkuExternalReferenceCode,
		r_usageDefinitionToEntitlementDefinition_c_usageDefinitionId:
			usageDefinitionId,
		skuExternalReferenceCodes,
	} = entitlementDefinition;

	return sortFindings([
		...toFinding(
			'entitlementDefinition',
			active === false ? [id] : [],
			'the-entitlement-definition-is-inactive',
			'warning'
		),
		...toFinding(
			'skus',
			entitlementDefinitionsBySKU && !skuExternalReferenceCodes.length
				? [id]
				: [],
			'the-entitlement-definition-has-no-skus',
			'danger'
		),
		...toFinding(
			'skus',
			productsBySKU
				? skuExternalReferenceCodes.filter(
						(skuExternalReferenceCode) =>
							!productsBySKU.has(skuExternalReferenceCode)
					)
				: [],
			'skus-match-no-product',
			'danger'
		),
		...toFinding(
			'entitlementDefinition',
			generatesActivationKey && !licenseKeyFamily ? [id] : [],
			'the-entitlement-definition-generates-activation-keys-but-has-no-license-key-family',
			'warning'
		),
		...toFinding(
			'entitlementDefinition',
			Number(overageRate) > 0 && !overageSkuExternalReferenceCode
				? [id]
				: [],
			'the-entitlement-definition-has-an-overage-rate-but-no-overage-sku',
			'warning'
		),
		...toFinding(
			'entitlementDefinition',
			productsBySKU &&
				overageSkuExternalReferenceCode &&
				!productsBySKU.has(overageSkuExternalReferenceCode)
				? [overageSkuExternalReferenceCode]
				: [],
			'the-overage-sku-matches-no-product',
			'danger'
		),
		...toFinding(
			'usageDefinition',
			usageDefinitionIds &&
				usageDefinitionId &&
				!usageDefinitionIds.has(usageDefinitionId)
				? [usageDefinitionId]
				: [],
			'the-usage-definition-does-not-exist',
			'danger'
		),
	]);
}

export default getEntitlementDefinitionFindings;
