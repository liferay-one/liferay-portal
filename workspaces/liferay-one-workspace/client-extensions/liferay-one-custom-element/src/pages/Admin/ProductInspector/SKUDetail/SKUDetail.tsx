/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLabel from '@clayui/label';
import {useEffect, useMemo} from 'react';
import {Link, useParams, useSearchParams} from 'react-router';
import BackLink from '~/components/BackLink/BackLink';
import EmptyState from '~/components/EmptyState/EmptyState';
import {PageRenderer} from '~/components/Page/Page';
import RowActionsMenu from '~/components/RowActionsMenu/RowActionsMenu';
import i18n from '~/i18n';
import InspectorTable from '~/pages/Admin/components/InspectorTable/InspectorTable';

import InspectorFindings from '../components/InspectorFindings/InspectorFindings';
import useProductCatalogInspection from '../hooks/useProductCatalogInspection';
import {
	PRODUCT_COLLECTION_LABELS,
	getFlaggedIdsByCollection,
	getProductName,
	scrollToSection,
} from '../utils/productCatalogUtils';
import {
	getEntitlementDefinitionColumns,
	getProductPath,
} from '../utils/productInspectorColumnsUtils';
import SKUSummary from './components/SKUSummary/SKUSummary';
import getSKUFindings from './utils/getSKUFindings';
import getSKUOptionRows from './utils/getSKUOptionRows';
import {
	SHARED_PRODUCT_COLUMNS,
	SKU_OPTION_COLUMNS,
} from './utils/skuDetailColumnsUtils';

import type {
	InspectedProduct,
	InspectedSKU,
	ProductCollectionKey,
} from '~/types/productInspection';

import type {ProductCatalogAudit} from '../hooks/useProductCatalogInspection';

const SECTION_ID_PREFIX = 'sku-inspector';

function SKUContent({
	audit: {entitlementDefinitionFindings, index, inspection, productFindings},
	product,
	sku,
}: {
	audit: ProductCatalogAudit;
	product: InspectedProduct;
	sku: InspectedSKU;
}) {
	const entitlementDefinitions = useMemo(
		() =>
			index.entitlementDefinitionsBySKU?.get(
				sku.externalReferenceCode ?? ''
			) ?? [],
		[index, sku.externalReferenceCode]
	);

	const otherProducts = useMemo(
		() =>
			(
				index.productsBySKU?.get(sku.externalReferenceCode ?? '') ?? []
			).filter(({id}) => id !== product.id),
		[index, product.id, sku.externalReferenceCode]
	);

	const findings = useMemo(
		() =>
			getSKUFindings(
				productFindings.get(product.id) ?? [],
				sku.id,
				new Set(entitlementDefinitions.map(({id}) => id))
			),
		[entitlementDefinitions, product.id, productFindings, sku.id]
	);

	const flaggedIds = useMemo(
		() => getFlaggedIdsByCollection(findings),
		[findings]
	);

	const sectionId = (collection: ProductCollectionKey) =>
		`${SECTION_ID_PREFIX}-${collection}`;

	const [searchParams] = useSearchParams();

	const section = searchParams.get('section');

	useEffect(() => {
		if (section) {
			scrollToSection(`${SECTION_ID_PREFIX}-${section}`);
		}
	}, [section]);

	return (
		<>
			<div className="mb-4">
				<h2 className="mb-1">
					{sku.sku || sku.externalReferenceCode || `#${sku.id}`}
				</h2>

				<div className="align-items-center d-flex text-secondary">
					<span className="mr-3">{sku.externalReferenceCode}</span>

					<Link
						className="mr-3"
						to={getProductPath(product.externalReferenceCode)}
					>
						{getProductName(product)}
					</Link>

					<ClayLabel
						displayType={sku.published ? 'secondary' : 'warning'}
					>
						{i18n.translate(
							sku.published ? 'published' : 'unpublished'
						)}
					</ClayLabel>
				</div>
			</div>

			<InspectorFindings
				collectionLabels={PRODUCT_COLLECTION_LABELS}
				emptyMessage="no-problems-were-found-for-this-sku"
				findings={findings}
				onSelect={(collection) =>
					scrollToSection(sectionId(collection))
				}
			/>

			<SKUSummary
				id={sectionId('skus')}
				productName={getProductName(product)}
				sku={sku}
			/>

			<InspectorTable
				columns={getEntitlementDefinitionColumns(
					entitlementDefinitionFindings,
					index,
					{
						linked: false,
						productExternalReferenceCode:
							product.externalReferenceCode,
						productsVisible: false,
					}
				)}
				defaultExpanded
				entries={entitlementDefinitions}
				error={inspection.entitlementDefinitions.error}
				flaggedIds={flaggedIds.get('entitlementDefinitions')}
				id={sectionId('entitlementDefinitions')}
				title={i18n.translate('entitlement-definitions')}
			/>

			<InspectorTable
				columns={SKU_OPTION_COLUMNS}
				defaultExpanded
				entries={getSKUOptionRows(product, sku)}
				id={`${SECTION_ID_PREFIX}-options`}
				title={i18n.translate('options')}
			/>

			<InspectorTable
				columns={SHARED_PRODUCT_COLUMNS}
				entries={otherProducts}
				id={`${SECTION_ID_PREFIX}-products`}
				title={i18n.translate('other-products-with-this-sku')}
			/>
		</>
	);
}

export default function SKUDetail() {
	const {externalReferenceCode, skuExternalReferenceCode} = useParams();

	const {audit, error, isLoading, isValidating, mutate} =
		useProductCatalogInspection();

	const product = audit?.inspection.products.items.find(
		(product) => product.externalReferenceCode === externalReferenceCode
	);

	const sku = product?.skus?.find(
		(sku) => sku.externalReferenceCode === skuExternalReferenceCode
	);

	return (
		<div className="account-inspector w-100">
			<div className="align-items-center d-flex justify-content-between mb-4">
				<BackLink path={getProductPath(externalReferenceCode)}>
					{i18n.translate('back-to-product')}
				</BackLink>

				<RowActionsMenu
					actions={[
						{
							disabled: isValidating,
							label: 'reload',
							onClick: () => mutate(),
						},
					]}
				/>
			</div>

			<PageRenderer error={error} isLoading={isLoading}>
				{audit && (!product || !sku) && (
					<EmptyState
						description={i18n.translate('the-sku-was-not-found')}
						title={i18n.translate('no-results-found')}
						type="EMPTY_SEARCH"
					/>
				)}

				{audit && product && sku && (
					<SKUContent
						audit={audit}
						key={`${audit.inspection.loadedAt}-${sku.id}`}
						product={product}
						sku={sku}
					/>
				)}
			</PageRenderer>
		</div>
	);
}
