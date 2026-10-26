/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useNavigate} from 'react-router';
import Page, {PageRenderer} from '~/components/Page/Page';
import RowActionsMenu from '~/components/RowActionsMenu/RowActionsMenu';
import i18n from '~/i18n';
import InspectorStats from '~/pages/Admin/components/InspectorStats/InspectorStats';
import InspectorTable from '~/pages/Admin/components/InspectorTable/InspectorTable';

import ProductOrphans from './components/ProductOrphans/ProductOrphans';
import useProductCatalogInspection from './hooks/useProductCatalogInspection';
import getProductOrphans from './utils/getProductOrphans';
import {
	getFlaggedIds,
	getProductControlPanelURL,
	getProductName,
} from './utils/productCatalogUtils';
import {
	getProductColumns,
	getProductPath,
} from './utils/productInspectorColumnsUtils';

import type {InspectedProduct} from '~/types/productInspection';

import type {ProductCatalogAudit} from './hooks/useProductCatalogInspection';

function ProductInspectorContent({
	audit: {
		catalogNames,
		entitlementDefinitionFindings,
		index,
		inspection,
		productFindings,
	},
}: {
	audit: ProductCatalogAudit;
}) {
	const navigate = useNavigate();

	const {entitlementDefinitions, products} = inspection;

	const sortedProducts = useMemo(
		() =>
			[...products.items].sort((product1, product2) =>
				getProductName(product1).localeCompare(getProductName(product2))
			),
		[products.items]
	);

	const orphans = useMemo(
		() => getProductOrphans(inspection, index),
		[index, inspection]
	);

	const orphanCount = Object.values(orphans).reduce(
		(count, entries) => count + (entries?.length ?? 0),
		0
	);

	const productColumns = useMemo(
		() => getProductColumns(catalogNames, productFindings, index),
		[catalogNames, index, productFindings]
	);

	const flaggedProductIds = useMemo(
		() => getFlaggedIds(productFindings),
		[productFindings]
	);

	const getProductActions = (product: InspectedProduct) => [
		{
			label: 'view-details' as const,
			onClick: () => navigate(getProductPath(product.id)),
		},
		{
			label: 'view-in-control-panel' as const,
			onClick: () =>
				window.open(
					getProductControlPanelURL(product.id),
					'_blank',
					'noopener,noreferrer'
				),
		},
	];

	return (
		<>
			<InspectorStats
				stats={[
					{label: 'products', value: products.totalCount},
					{
						label: 'products-with-problems',
						severity: flaggedProductIds.size
							? 'warning'
							: undefined,
						value: flaggedProductIds.size,
					},
					{
						label: 'entitlement-definitions',
						value: entitlementDefinitions.totalCount,
					},
					{
						label: 'orphans',
						severity: orphanCount ? 'warning' : undefined,
						value: orphanCount,
					},
				]}
			/>

			<InspectorTable
				bare
				columns={productColumns}
				entries={sortedProducts}
				error={products.error}
				flaggedIds={flaggedProductIds}
				getRowActions={getProductActions}
				id="product-inspector-products"
				title={i18n.translate('products')}
				totalCount={products.totalCount}
				truncated={products.truncated}
			/>

			<ProductOrphans
				entitlementDefinitionFindings={entitlementDefinitionFindings}
				getProductActions={getProductActions}
				index={index}
				orphans={orphans}
				productColumns={productColumns}
			/>
		</>
	);
}

export default function ProductInspector() {
	const {audit, error, isLoading, isValidating, mutate} =
		useProductCatalogInspection();

	return (
		<Page
			description={i18n.translate(
				'audit-every-product-its-specifications-skus-and-entitlement-definitions-and-the-problems-found-in-them'
			)}
			rightButton={
				<RowActionsMenu
					actions={[
						{
							disabled: isValidating,
							label: 'reload',
							onClick: () => mutate(),
						},
					]}
				/>
			}
			title={i18n.translate('product-inspector')}
		>
			<div className="account-inspector">
				<PageRenderer error={error} isLoading={isLoading}>
					{audit && (
						<ProductInspectorContent
							audit={audit}
							key={audit.inspection.loadedAt}
						/>
					)}
				</PageRenderer>
			</div>
		</Page>
	);
}
