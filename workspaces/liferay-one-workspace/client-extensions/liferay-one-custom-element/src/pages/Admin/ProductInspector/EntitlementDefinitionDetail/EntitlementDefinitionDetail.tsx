/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLabel from '@clayui/label';
import {useMemo} from 'react';
import {useParams, useSearchParams} from 'react-router';
import BackLink from '~/components/BackLink/BackLink';
import EmptyState from '~/components/EmptyState/EmptyState';
import {PageRenderer} from '~/components/Page/Page';
import RowActionsMenu from '~/components/RowActionsMenu/RowActionsMenu';
import {useDataQuery} from '~/hooks/useDataQuery';
import i18n from '~/i18n';
import InspectorTable from '~/pages/Admin/components/InspectorTable/InspectorTable';
import {entitlementDefinitionEntitlementsQuery} from '~/services/queries/entitlementDefinitionEntitlementsQuery';

import InspectorFindings from '../components/InspectorFindings/InspectorFindings';
import useProductCatalogInspection from '../hooks/useProductCatalogInspection';
import {
	ENTITLEMENT_DEFINITION_COLLECTION_LABELS,
	getFlaggedIdsByCollection,
	scrollToSection,
} from '../utils/productCatalogUtils';
import {getEntitlementDefinitionName} from '../utils/productInspectorColumnsUtils';
import EntitlementDefinitionSummary from './components/EntitlementDefinitionSummary/EntitlementDefinitionSummary';
import {
	ENTITLEMENT_COLUMNS,
	SKU_PRODUCT_COLUMNS,
} from './utils/entitlementDefinitionDetailConstants';
import getSKUProductRows from './utils/getSKUProductRows';

import type FetcherError from '~/services/fetcher/FetcherError';
import type {
	EntitlementDefinitionCollectionKey,
	InspectedEntitlementDefinition,
} from '~/types/productInspection';

import type {ProductCatalogAudit} from '../hooks/useProductCatalogInspection';

const SECTION_ID_PREFIX = 'entitlement-definition-inspector';

function EntitlementDefinitionContent({
	audit: {entitlementDefinitionFindings, index, inspection},
	entitlementDefinition,
}: {
	audit: ProductCatalogAudit;
	entitlementDefinition: InspectedEntitlementDefinition;
}) {
	const findings = useMemo(
		() => entitlementDefinitionFindings.get(entitlementDefinition.id) ?? [],
		[entitlementDefinition.id, entitlementDefinitionFindings]
	);

	const entitlements = useDataQuery(
		entitlementDefinitionEntitlementsQuery(entitlementDefinition.id),
		{revalidateOnFocus: false}
	);

	const skuProductRows = useMemo(
		() => getSKUProductRows(entitlementDefinition, index),
		[entitlementDefinition, index]
	);

	const flaggedSKUProductIds = useMemo(() => {
		const flaggedSKUs =
			getFlaggedIdsByCollection(findings).get('skus') ?? new Set();

		return new Set<number | string>(
			skuProductRows
				.filter(({skuExternalReferenceCode}) =>
					flaggedSKUs.has(skuExternalReferenceCode)
				)
				.map(({id}) => id)
		);
	}, [findings, skuProductRows]);

	const usageDefinition = inspection.usageDefinitions.items.find(
		({id}) =>
			id ===
			entitlementDefinition.r_usageDefinitionToEntitlementDefinition_c_usageDefinitionId
	);

	const sectionId = (collection: EntitlementDefinitionCollectionKey) =>
		`${SECTION_ID_PREFIX}-${collection}`;

	return (
		<>
			<div className="mb-4">
				<h2 className="mb-1">
					{getEntitlementDefinitionName(entitlementDefinition)}
				</h2>

				<div className="align-items-center d-flex text-secondary">
					<span className="mr-3">
						{entitlementDefinition.externalReferenceCode}
					</span>

					<ClayLabel
						displayType={
							entitlementDefinition.active === false
								? 'warning'
								: 'secondary'
						}
					>
						{i18n.translate(
							entitlementDefinition.active === false
								? 'inactive'
								: 'active'
						)}
					</ClayLabel>
				</div>
			</div>

			<InspectorFindings
				collectionLabels={ENTITLEMENT_DEFINITION_COLLECTION_LABELS}
				emptyMessage="no-problems-were-found-for-this-entitlement-definition"
				findings={findings}
				onSelect={(collection) =>
					scrollToSection(sectionId(collection))
				}
			/>

			<EntitlementDefinitionSummary
				entitlementDefinition={entitlementDefinition}
				id={sectionId('entitlementDefinition')}
				usageDefinition={usageDefinition}
				usageDefinitionId={sectionId('usageDefinition')}
			/>

			<InspectorTable
				columns={SKU_PRODUCT_COLUMNS}
				defaultExpanded
				entries={skuProductRows}
				flaggedIds={flaggedSKUProductIds}
				id={sectionId('skus')}
				title={i18n.translate('skus-and-products')}
			/>

			<InspectorTable
				columns={ENTITLEMENT_COLUMNS}
				defaultExpanded
				entries={entitlements.data?.items ?? []}
				error={
					entitlements.error
						? (entitlements.error as FetcherError).message
						: undefined
				}
				id={sectionId('entitlements')}
				title={i18n.translate('entitlements')}
				totalCount={entitlements.data?.totalCount ?? 0}
				truncated={
					(entitlements.data?.totalCount ?? 0) >
					(entitlements.data?.items.length ?? 0)
				}
			/>
		</>
	);
}

export default function EntitlementDefinitionDetail() {
	const {entitlementDefinitionId} = useParams();
	const [searchParams] = useSearchParams();

	const {audit, error, isLoading, isValidating, mutate} =
		useProductCatalogInspection();

	const entitlementDefinition =
		audit?.inspection.entitlementDefinitions.items.find(
			({id}) => String(id) === entitlementDefinitionId
		);

	const productId = searchParams.get('productId');

	return (
		<div className="account-inspector w-100">
			<div className="align-items-center d-flex justify-content-between mb-4">
				<BackLink
					path={
						productId
							? `/product-inspector/${productId}`
							: '/product-inspector'
					}
				>
					{i18n.translate(
						productId ? 'back-to-product' : 'back-to-products'
					)}
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
				{audit && !entitlementDefinition && (
					<EmptyState
						description={i18n.translate(
							'the-entitlement-definition-was-not-found'
						)}
						title={i18n.translate('no-results-found')}
						type="EMPTY_SEARCH"
					/>
				)}

				{audit && entitlementDefinition && (
					<EntitlementDefinitionContent
						audit={audit}
						entitlementDefinition={entitlementDefinition}
						key={`${audit.inspection.loadedAt}-${entitlementDefinition.id}`}
					/>
				)}
			</PageRenderer>
		</div>
	);
}
