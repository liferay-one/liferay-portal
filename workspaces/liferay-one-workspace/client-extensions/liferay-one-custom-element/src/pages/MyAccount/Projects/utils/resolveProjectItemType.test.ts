/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import resolveProjectItemType from './resolveProjectItemType';

import type {DeliveryProductSpecification} from '~/types/product';

function toSpecifications(value?: string) {
	return (
		value ? [{specificationKey: 'project-item-type', value}] : []
	) as DeliveryProductSpecification[];
}

describe('[MOD-MYACCOUNT-PROJECTS-RESOLVEPROJECTITEMTYPE] resolveProjectItemType', () => {
	it('reads the project item type case insensitively', () => {
		expect(resolveProjectItemType(toSpecifications('Application'))).toBe(
			'application'
		);
		expect(resolveProjectItemType(toSpecifications('PRODUCT'))).toBe(
			'product'
		);
	});

	it('returns undefined for an unknown or missing type', () => {
		expect(
			resolveProjectItemType(toSpecifications('bundle'))
		).toBeUndefined();
		expect(resolveProjectItemType(toSpecifications())).toBeUndefined();
	});
});
