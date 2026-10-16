/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ProductSpecificationKey, SolutionTypes} from '~/enums/Product';

import type {DeliveryProductSpecification} from '~/types/product';

const FREE_ACTIVATION_KEY_SOLUTION_TYPES: string[] = [
	SolutionTypes.CMP_TRIAL,
	SolutionTypes.DSR_TRIAL,
	SolutionTypes.DXP,
];

export function isFreeActivationKeyProduct(
	specifications: DeliveryProductSpecification[]
): boolean {
	const specification = specifications.find(
		({specificationKey}) =>
			specificationKey === ProductSpecificationKey.SOLUTION_TYPE
	);

	return FREE_ACTIVATION_KEY_SOLUTION_TYPES.includes(
		specification?.value ?? ''
	);
}

export default isFreeActivationKeyProduct;
