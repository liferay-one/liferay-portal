/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	PROJECT_ITEM_TYPE_SPECIFICATION_KEY,
	WORKFLOW_STATUS_APPROVED,
	getEntitlementDefinitions,
	getLocalizedValue,
	sortFindings,
	toCollectionFinding,
	toFinding,
	toSpecificationRowId,
} from './productCatalogUtils';

import type {
	InspectedProduct,
	InspectorFinding,
	ProductCollectionKey,
} from '~/types/productInspection';

import type {CatalogIndex} from './productCatalogUtils';

export type ProductFinding = InspectorFinding<ProductCollectionKey>;

function getProductChecks(product: InspectedProduct): ProductFinding[] {
	const isApproved =
		product.workflowStatusInfo?.code === WORKFLOW_STATUS_APPROVED;

	return [
		...toFinding(
			'product',
			product.active ? [] : [product.id],
			'the-product-is-inactive',
			'warning'
		),
		...toCollectionFinding(
			'skus',
			!product.skus?.length,
			'the-product-has-no-skus',
			'danger'
		),
		...toCollectionFinding(
			'categories',
			isApproved && !product.categories?.length,
			'the-approved-product-has-no-categories',
			'info'
		),
	];
}

function getSpecificationChecks(
	product: InspectedProduct,
	index: CatalogIndex
): ProductFinding[] {
	const productSpecifications = product.productSpecifications ?? [];

	const specificationKeys = productSpecifications.map(
		({specificationKey}) => specificationKey
	);

	const specificationEntries = productSpecifications.map(
		({specificationKey, value}) =>
			`${specificationKey}=${getLocalizedValue(value).trim()}`
	);

	const specificationIds = (
		predicate: (
			productSpecification: (typeof productSpecifications)[number]
		) => boolean
	) =>
		productSpecifications
			.map((productSpecification, position) => ({
				id: toSpecificationRowId(productSpecification.id, position),
				productSpecification,
			}))
			.filter(({productSpecification}) => predicate(productSpecification))
			.map(({id}) => id);

	return [
		...toCollectionFinding(
			'productSpecifications',
			!product.incompleteCollections.includes('productSpecifications') &&
				!specificationKeys.includes(
					PROJECT_ITEM_TYPE_SPECIFICATION_KEY
				),
			'the-product-has-no-project-item-type-specification',
			'warning'
		),
		...toFinding(
			'productSpecifications',
			specificationIds(({value}) => !getLocalizedValue(value).trim()),
			'specifications-have-no-value',
			'warning'
		),
		...toFinding(
			'productSpecifications',
			specificationIds((productSpecification) => {
				const specificationEntry =
					specificationEntries[
						productSpecifications.indexOf(productSpecification)
					];

				return (
					specificationEntries.indexOf(specificationEntry) !==
					specificationEntries.lastIndexOf(specificationEntry)
				);
			}),
			'specifications-repeat-the-key-and-value-of-another-specification',
			'warning'
		),
		...toFinding(
			'productSpecifications',
			index.specificationKeys
				? specificationIds(
						({specificationKey}) =>
							!index.specificationKeys!.has(specificationKey)
					)
				: [],
			'specifications-have-no-specification-definition',
			'danger'
		),
	];
}

function getSKUChecks(
	product: InspectedProduct,
	index: CatalogIndex
): ProductFinding[] {
	const skus = product.skus ?? [];

	const {productsBySKU} = index;

	const isApproved =
		product.workflowStatusInfo?.code === WORKFLOW_STATUS_APPROVED;

	return [
		...toFinding(
			'skus',
			productsBySKU
				? skus
						.filter(
							({externalReferenceCode}) =>
								(
									productsBySKU.get(
										externalReferenceCode ?? ''
									) ?? []
								).length > 1
						)
						.map(({id}) => id)
				: [],
			'skus-are-also-used-by-another-product',
			'danger'
		),
		...toFinding(
			'skus',
			isApproved
				? skus
						.filter(
							({published, purchasable}) =>
								!published || !purchasable
						)
						.map(({id}) => id)
				: [],
			'skus-are-not-published-or-not-purchasable',
			'info'
		),
	];
}

function getEntitlementDefinitionChecks(
	product: InspectedProduct,
	index: CatalogIndex
): ProductFinding[] {
	return toFinding(
		'entitlementDefinitions',
		getEntitlementDefinitions(product, index)
			.filter(({active}) => active === false)
			.map(({id}) => id),
		'entitlement-definitions-are-inactive',
		'warning'
	);
}

function getLoadErrorChecks(product: InspectedProduct): ProductFinding[] {
	return product.incompleteCollections.map((collection) => ({
		collection,
		ids: [],
		message: 'only-part-of-the-records-could-be-loaded',
		severity: 'warning',
	}));
}

function getProductFindings(
	product: InspectedProduct,
	index: CatalogIndex
): ProductFinding[] {
	return sortFindings([
		...getLoadErrorChecks(product),
		...getProductChecks(product),
		...getSpecificationChecks(product, index),
		...getSKUChecks(product, index),
		...getEntitlementDefinitionChecks(product, index),
	]);
}

export default getProductFindings;
