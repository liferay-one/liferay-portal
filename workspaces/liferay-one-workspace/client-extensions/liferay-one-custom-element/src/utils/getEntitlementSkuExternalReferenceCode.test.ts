/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {getEntitlementSkuExternalReferenceCode} from './getEntitlementSkuExternalReferenceCode';

describe('[MOD-GETENTITLEMENTSKUEXTERNALREFERENCECODE] getEntitlementSkuExternalReferenceCode', () => {
	it('prefers the SKU recorded on the entitlement', () => {
		expect(
			getEntitlementSkuExternalReferenceCode({
				entitlementDefinitionToEntitlement: {
					skuExternalReferenceCode: 'SKU-DEFINITION',
				},
				skuExternalReferenceCode: 'SKU-ENTITLEMENT',
			})
		).toBe('SKU-ENTITLEMENT');
	});

	it('falls back to the SKU of the entitlement definition', () => {
		expect(
			getEntitlementSkuExternalReferenceCode({
				entitlementDefinitionToEntitlement: {
					skuExternalReferenceCode: 'SKU-DEFINITION',
				},
				skuExternalReferenceCode: '',
			})
		).toBe('SKU-DEFINITION');
	});

	it('returns undefined without either SKU', () => {
		expect(getEntitlementSkuExternalReferenceCode({})).toBeUndefined();
	});
});
