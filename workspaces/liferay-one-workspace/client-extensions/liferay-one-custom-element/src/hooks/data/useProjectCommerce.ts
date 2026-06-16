/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {format} from 'date-fns';
import {useMemo} from 'react';
import useSWR from 'swr';

import {Liferay} from '../../liferay/liferay';
import HeadlessCommerceDeliveryCatalog from '../../services/rest/HeadlessCommerceDeliveryCatalog';
import {useFetch} from '../useFetch';

export type ProjectContract = {
	endDate?: string;
	externalReferenceCode: string;
	name: string;
	spendLimit?: number;
	startDate?: string;
	status?: string;
	termMonths?: number;
};

export type ProjectProduct = {
	categoryNames: string[];
	description: string;
	externalReferenceCode: string;
	id: string;
	name: string;
	productId: number;
	publisher: string;
	saleType: string;
	specifications: DeliveryProductSpecification[];
	startDate: string;
	status: string;
	type: string;
};

type EntitlementNode = {
	endDate?: string;
	entitlementDefinitionToEntitlement?: {
		commerceProductToEntitlementDefinitionERC?: string;
		displayName?: string;
	};
	externalReferenceCode: string;
	name: string;
	startDate?: string;
};

type ContractNode = {
	contractTerm?: number;
	contractToEntitlement?: EntitlementNode[];
	customStatus?: string;
	endDate?: string;
	externalReferenceCode: string;
	name: string;
	spendLimit?: number;
	startDate?: string;
};

type ProjectNode = {
	projectToContract?: ContractNode[];
};

export function getSpecificationValue(
	product: DeliveryProduct,
	key: string
): string {
	return (
		(product.productSpecifications ?? []).find(
			(specification) => specification.specificationKey === key
		)?.value ?? ''
	);
}

export function getSpecificationValues(
	product: DeliveryProduct,
	key: string
): string[] {
	return (product.productSpecifications ?? [])
		.filter((specification) => specification.specificationKey === key)
		.map((specification) => specification.value);
}

function useChannelProducts() {
	const channelId = Liferay.CommerceContext.commerceChannelId;

	return useSWR(`/project-channel-products/${channelId}`, () =>
		HeadlessCommerceDeliveryCatalog.getProductsPage(
			channelId,
			new URLSearchParams({
				'accountId': '-1',
				'images.accountId': '-1',
				'nestedFields': 'categories,images,productSpecifications,skus',
				'pageSize': '100',
				'skus.accountId': '-1',
				'skus.currencyCode':
					Liferay.CommerceContext.currency.currencyCode,
			})
		)
	);
}

// Resolves the selected project's contract and the products it is entitled to
// through the chain Project -> Contract -> Entitlement -> EntitlementDefinition
// -> CommerceProduct, all in a single nested headless request.

export function useProjectCommerce(projectExternalReferenceCode: string) {
	const {data, error, loading} = useFetch<ProjectNode>(
		projectExternalReferenceCode
			? `/o/c/projects/by-external-reference-code/${projectExternalReferenceCode}`
			: null,
		{
			params: {
				nestedFields:
					'projectToContract,contractToEntitlement,entitlementDefinitionToEntitlement',
				nestedFieldsDepth: 5,
			},
		}
	);

	const contractNode = data?.projectToContract?.[0];

	const contract: ProjectContract | undefined = contractNode && {
		endDate: contractNode.endDate,
		externalReferenceCode: contractNode.externalReferenceCode,
		name: contractNode.name,
		spendLimit: contractNode.spendLimit,
		startDate: contractNode.startDate,
		status: contractNode.customStatus,
		termMonths: contractNode.contractTerm,
	};

	const entitlements = (contractNode?.contractToEntitlement ?? [])
		.map((entitlement) => ({
			endDate: entitlement.endDate,
			productExternalReferenceCode:
				entitlement.entitlementDefinitionToEntitlement
					?.commerceProductToEntitlementDefinitionERC,
			startDate: entitlement.startDate,
		}))
		.filter((entitlement) => entitlement.productExternalReferenceCode);

	return {contract, entitlements, error, loading};
}

// Joins the project's entitlements with the live delivery catalog so each
// entitled product is returned with its display metadata and specifications.

export function useProjectProducts(projectExternalReferenceCode: string) {
	const {
		contract,
		entitlements,
		error: commerceError,
		loading: commerceLoading,
	} = useProjectCommerce(projectExternalReferenceCode);

	const {
		data: productsData,
		error: productsError,
		isLoading: productsLoading,
	} = useChannelProducts();

	const products = useMemo<ProjectProduct[]>(() => {
		const productsByExternalReferenceCode = new Map(
			(productsData?.items ?? []).map((product) => [
				product.externalReferenceCode,
				product,
			])
		);

		return entitlements
			.map((entitlement) => {
				const product = productsByExternalReferenceCode.get(
					entitlement.productExternalReferenceCode as string
				);

				if (!product) {
					return null;
				}

				const categoryNames = (product.categories ?? []).map(
					(category) => category.name
				);

				return {
					categoryNames,
					description: product.description,
					externalReferenceCode: product.externalReferenceCode,
					id: String(product.id),
					name: product.name,
					productId: product.productId ?? product.id,
					publisher: getSpecificationValue(product, 'publisher-name'),
					saleType: getSpecificationValue(product, 'price-model'),
					specifications: product.productSpecifications ?? [],
					startDate: entitlement.startDate
						? format(new Date(entitlement.startDate), 'MMM d, yyyy')
						: '',
					status: 'active',
					type:
						getSpecificationValues(
							product,
							'liferay-products-categories'
						)[0] ?? getSpecificationValue(product, 'price-model'),
				};
			})
			.filter((product): product is ProjectProduct => Boolean(product));
	}, [entitlements, productsData]);

	return {
		contract,
		error: commerceError ?? productsError,
		loading: commerceLoading || productsLoading,
		products,
	};
}
