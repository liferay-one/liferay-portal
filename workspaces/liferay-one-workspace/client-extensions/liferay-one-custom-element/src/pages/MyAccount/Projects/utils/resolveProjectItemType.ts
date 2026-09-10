/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {PROJECT_ITEM_TYPES} from '../types';

import type {DeliveryProductSpecification} from '~/types/product';

import type {ProjectItemType} from '../types';

export function resolveProjectItemType(
	specifications: DeliveryProductSpecification[]
): ProjectItemType | undefined {
	const specification = specifications.find(
		({specificationKey}) => specificationKey === 'project-item-type'
	);

	const value = (specification?.value ?? '').toLowerCase();

	return PROJECT_ITEM_TYPES.find(
		(projectItemType) => projectItemType === value
	);
}

export default resolveProjectItemType;
