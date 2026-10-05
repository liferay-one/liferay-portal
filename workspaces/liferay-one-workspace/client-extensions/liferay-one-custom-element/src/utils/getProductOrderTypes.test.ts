/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getProductOrderTypes from './getProductOrderTypes';

describe('[MOD-GETPRODUCTORDERTYPES] getProductOrderTypes', () => {
	it('maps each known product type case insensitively', () => {
		expect(getProductOrderTypes('Cloud')).toEqual({
			externalReferenceCode: 'CLOUD_APP',
		});
		expect(getProductOrderTypes('DXP').externalReferenceCode).toBe(
			'DXP_APP'
		);
		expect(getProductOrderTypes('ssa-saas').externalReferenceCode).toBe(
			'SSA_SAAS'
		);
		expect(getProductOrderTypes('ai-hub').externalReferenceCode).toBe(
			'AI_HUB'
		);
	});

	it('returns NOTYPE for an unknown type', () => {
		expect(getProductOrderTypes('theme').externalReferenceCode).toBe(
			'NOTYPE'
		);
	});
});
