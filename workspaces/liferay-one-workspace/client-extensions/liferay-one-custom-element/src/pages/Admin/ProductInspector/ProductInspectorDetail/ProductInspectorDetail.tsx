/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLabel from '@clayui/label';
import {useMemo} from 'react';
import {useParams} from 'react-router';
import BackLink from '~/components/BackLink/BackLink';
import EmptyState from '~/components/EmptyState/EmptyState';
import {PageRenderer} from '~/components/Page/Page';
import RowActionsMenu from '~/components/RowActionsMenu/RowActionsMenu';
import i18n from '~/i18n';
import InspectorTable from '~/pages/Admin/components/InspectorTable/InspectorTable';
import InspectorTree from '~/pages/Admin/components/InspectorTree/InspectorTree';

import InspectorFindings from '../components/InspectorFindings/InspectorFindings';
import useProductCatalogInspection from '../hooks/useProductCatalogInspection';
import {
	PRODUCT_COLLECTION_LABELS,
	getEntitlementDefinitions,
	getFlaggedIdsByCollection,
	getProductControlPanelURL,
	getProductName,
	scrollToSection,
} from '../utils/productCatalogUtils';
import {getEntitlementDefinitionColumns} from '../utils/productInspectorColumnsUtils';
import ProductSummary from './components/ProductSummary/ProductSummary';
import buildProductTree from './utils/buildProductTree';
import {
	CATEGORY_COLUMNS,
	OPTION_COLUMNS,
	SPECIFICATION_COLUMNS,
	getOptionRows,
	getSKUColumns,
	getSpecificationRows,
} from './utils/productDetailColumnsUtils';

import type {
	InspectedProduct,
	ProductCollectionKey,
} from '~/types/productInspection';

import type {ProductCatalogAudit} from '../hooks/useProductCatalogInspection';

const SECTION_ID_PREFIX = 'product-inspector';

function ProductInspectorContent({
	audit: {
		catalogNames,
		entitlementDefinitionFindings,
		index,
		inspection,
		productFindings,
	},
	product,
}: {
	audit: ProductCatalogAudit;
	product: InspectedProduct;
}) {
	const findings = useMemo(
		() => productFindings.get(product.id) ?? [],
		[product.id, productFindings]
	);

	const flaggedIds = useMemo(
		() => getFlaggedIdsByCollection(findings),
		[findings]
	);

	const entitlementDefinitions = useMemo(
		() => getEntitlementDefinitions(product, index),
		[index, product]
	);

	const treeNodes = useMemo(
		() =>
			buildProductTree(product, {
				entitlementDefinitionFindings,
				findings,
				index,
				inspection,
			}),
		[entitlementDefinitionFindings, findings, index, inspection, product]
	);

	const sectionId = (collection: ProductCollectionKey) =>
		`${SECTION_ID_PREFIX}-${collection}`;

	const focusRecord = (
		collection: ProductCollectionKey,
		recordId?: number
	) => {
		const rowId = `${sectionId(collection)}-${recordId}`;

		scrollToSection(
			recordId !== undefined && document.getElementById(rowId)
				? rowId
				: sectionId(collection)
		);
	};

	return (
		<>
			<div className="mb-4">
				<h2 className="mb-1">{getProductName(product)}</h2>

				<div className="align-items-center d-flex text-secondary">
					<span className="mr-3">
						{product.externalReferenceCode}
					</span>

					<ClayLabel className="mr-2" displayType="secondary">
						{product.workflowStatusInfo?.label_i18n}
					</ClayLabel>

					<ClayLabel displayType="secondary">
						{product.productType}
					</ClayLabel>
				</div>
			</div>

			<InspectorFindings
				collectionLabels={PRODUCT_COLLECTION_LABELS}
				emptyMessage="no-problems-were-found-for-this-product"
				findings={findings}
				onSelect={(collection) =>
					scrollToSection(sectionId(collection))
				}
			/>

			<InspectorTree
				id={`${SECTION_ID_PREFIX}-tree`}
				isExpandedByDefault={({collection}) =>
					collection !== 'productSpecifications'
				}
				nodes={treeNodes}
				onSelect={({collection, recordId}) =>
					collection && focusRecord(collection, recordId)
				}
				rootLabel={getProductName(product)}
			/>

			<ProductSummary
				catalogName={catalogNames.get(product.catalogId)}
				id={sectionId('product')}
				product={product}
			/>

			<InspectorTable
				columns={SPECIFICATION_COLUMNS}
				defaultExpanded
				defaultPageSize={50}
				entries={getSpecificationRows(
					product,
					inspection.specifications.items
				)}
				flaggedIds={flaggedIds.get('productSpecifications')}
				id={sectionId('productSpecifications')}
				title={i18n.translate('specifications')}
			/>

			<InspectorTable
				columns={getSKUColumns(index, product.externalReferenceCode)}
				defaultExpanded
				entries={product.skus ?? []}
				flaggedIds={flaggedIds.get('skus')}
				id={sectionId('skus')}
				title={i18n.translate('skus')}
			/>

			<InspectorTable
				columns={getEntitlementDefinitionColumns(
					entitlementDefinitionFindings,
					index,
					product.externalReferenceCode
				)}
				defaultExpanded
				entries={entitlementDefinitions}
				error={inspection.entitlementDefinitions.error}
				flaggedIds={flaggedIds.get('entitlementDefinitions')}
				id={sectionId('entitlementDefinitions')}
				title={i18n.translate('entitlement-definitions')}
			/>

			<InspectorTable
				columns={OPTION_COLUMNS}
				entries={getOptionRows(product)}
				id={sectionId('productOptions')}
				title={i18n.translate('options')}
			/>

			<InspectorTable
				columns={CATEGORY_COLUMNS}
				entries={product.categories ?? []}
				id={sectionId('categories')}
				title={i18n.translate('categories')}
			/>
		</>
	);
}

export default function ProductInspectorDetail() {
	const {externalReferenceCode} = useParams();

	const {audit, error, isLoading, isValidating, mutate} =
		useProductCatalogInspection();

	const product = audit?.inspection.products.items.find(
		(product) => product.externalReferenceCode === externalReferenceCode
	);

	return (
		<div className="account-inspector w-100">
			<div className="align-items-center d-flex justify-content-between mb-4">
				<BackLink path="/product-inspector">
					{i18n.translate('back-to-products')}
				</BackLink>

				<RowActionsMenu
					actions={[
						...(product
							? [
									{
										label: 'view-in-control-panel' as const,
										onClick: () =>
											window.open(
												getProductControlPanelURL(
													product.id
												),
												'_blank',
												'noopener,noreferrer'
											),
									},
								]
							: []),
						{
							disabled: isValidating,
							label: 'reload',
							onClick: () => mutate(),
						},
					]}
				/>
			</div>

			<PageRenderer error={error} isLoading={isLoading}>
				{audit && !product && (
					<EmptyState
						description={i18n.translate(
							'the-product-was-not-found-in-the-catalog'
						)}
						title={i18n.translate('no-results-found')}
						type="EMPTY_SEARCH"
					/>
				)}

				{audit && product && (
					<ProductInspectorContent
						audit={audit}
						key={`${audit.inspection.loadedAt}-${product.id}`}
						product={product}
					/>
				)}
			</PageRenderer>
		</div>
	);
}
