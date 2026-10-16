/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import isFreeActivationKeyProduct from './isFreeActivationKeyProduct';

import type {DeliveryProductSpecification} from '~/types/product';

function toSpecifications(value?: string) {
	return (
		value ? [{specificationKey: 'solution-type', value}] : []
	) as DeliveryProductSpecification[];
}

describe('[MOD-MYACCOUNT-PROJECTS-ISFREEACTIVATIONKEYPRODUCT] isFreeActivationKeyProduct', () => {
	it('matches the free tier and the self service trial products', () => {
		expect(isFreeActivationKeyProduct(toSpecifications('cmp-trial'))).toBe(
			true
		);
		expect(isFreeActivationKeyProduct(toSpecifications('dsr-trial'))).toBe(
			true
		);
		expect(isFreeActivationKeyProduct(toSpecifications('dxp'))).toBe(true);
	});

	it('does not match a paid product or a product without a solution type', () => {
		expect(isFreeActivationKeyProduct(toSpecifications('cmp'))).toBe(false);
		expect(isFreeActivationKeyProduct(toSpecifications())).toBe(false);
	});
});
