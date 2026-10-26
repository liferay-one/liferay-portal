/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {toPageURL} from '~/services/fetcher/fetchAllPages';
import fetcher from '~/services/fetcher/fetcher';

import type {InspectedEntry} from '~/types/accountInspection';
import type {APIResponse, DataQuery} from '~/types/api';

const ENTITLEMENT_PAGE_SIZE = 100;

export function entitlementDefinitionEntitlementsQuery(
	entitlementDefinitionId?: number
): DataQuery<APIResponse<InspectedEntry>> {
	return {
		fetcher: () =>
			fetcher<APIResponse<InspectedEntry>>(
				toPageURL('/o/c/entitlements', 1, ENTITLEMENT_PAGE_SIZE, {
					filter: SearchBuilder.eq(
						'r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId',
						String(entitlementDefinitionId)
					),
					sort: 'dateCreated:desc',
				})
			),
		key: entitlementDefinitionId
			? `/entitlement-definition-entitlements/${entitlementDefinitionId}`
			: null,
	};
}
