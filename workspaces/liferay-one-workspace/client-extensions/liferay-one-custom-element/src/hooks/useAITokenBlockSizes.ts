/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useFetch} from '~/hooks/useFetch';
import SearchBuilder from '~/services/fetcher/SearchBuilder';

import type {APIResponse} from '~/types/api';

const ENTITLEMENT_NAME_AI_TOKEN_BLOCK = 'aiTokenBlock';

type EntitlementDefinitionNode = {
	defaultQuantity?: number;
	skuExternalReferenceCode: string;
};

export function useAITokenBlockSizes() {
	const {data, error, isLoading} = useFetch<
		APIResponse<EntitlementDefinitionNode>
	>('/o/c/entitlementdefinitions', {
		params: {
			fields: 'defaultQuantity,skuExternalReferenceCode',
			filter: new SearchBuilder()
				.eq('name', ENTITLEMENT_NAME_AI_TOKEN_BLOCK)
				.and()
				.eq('active', true)
				.build(),
			pageSize: 200,
		},
	});

	const tokenBlockSizes = useMemo(() => {
		const tokenBlockSizes = new Map<string, number>();

		for (const {defaultQuantity, skuExternalReferenceCode} of data?.items ??
			[]) {
			if (defaultQuantity && defaultQuantity > 0) {
				tokenBlockSizes.set(skuExternalReferenceCode, defaultQuantity);
			}
		}

		return tokenBlockSizes;
	}, [data]);

	return {error, isLoading, tokenBlockSizes};
}
