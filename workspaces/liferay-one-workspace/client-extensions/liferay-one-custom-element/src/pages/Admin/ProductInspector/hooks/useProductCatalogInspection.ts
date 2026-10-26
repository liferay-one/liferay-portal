/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useDataQuery} from '~/hooks/useDataQuery';
import {productCatalogInspectionQuery} from '~/services/queries/productCatalogInspectionQuery';

import getEntitlementDefinitionFindings from '../utils/getEntitlementDefinitionFindings';
import getProductFindings from '../utils/getProductFindings';
import {buildCatalogIndex} from '../utils/productCatalogUtils';

import type FetcherError from '~/services/fetcher/FetcherError';

export type ProductCatalogAudit = NonNullable<
	ReturnType<typeof useProductCatalogInspection>['audit']
>;

export default function useProductCatalogInspection() {
	const {data, error, isLoading, isValidating, mutate} = useDataQuery(
		productCatalogInspectionQuery(),
		{revalidateOnFocus: false}
	);

	const audit = useMemo(() => {
		if (!data) {
			return null;
		}

		const index = buildCatalogIndex(data);

		return {
			catalogNames: new Map(
				data.catalogs.items.map(({id, name}) => [id, name])
			),
			entitlementDefinitionFindings: new Map(
				data.entitlementDefinitions.items.map(
					(entitlementDefinition) => [
						entitlementDefinition.id,
						getEntitlementDefinitionFindings(
							entitlementDefinition,
							index
						),
					]
				)
			),
			index,
			inspection: data,
			productFindings: new Map(
				data.products.items.map((product) => [
					product.id,
					getProductFindings(product, index),
				])
			),
		};
	}, [data]);

	return {
		audit,
		error: error as FetcherError | undefined,
		isLoading,
		isValidating,
		mutate,
	};
}
