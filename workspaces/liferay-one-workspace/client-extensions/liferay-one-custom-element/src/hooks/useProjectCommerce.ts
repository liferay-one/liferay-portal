/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import useSWR from 'swr';
import {EXPERIENCE_OFFERING_PRODUCT_EXTERNAL_REFERENCE_CODES} from '~/enums/Product';
import {useFetch} from '~/hooks/useFetch';
import i18n from '~/i18n';
import {getProductContactRoleExternalReferenceCodes} from '~/pages/MyAccount/ProjectMembers/projectRoles';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/projects';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import {Liferay} from '~/services/liferay/liferay';

import type {APIResponse} from '~/types/api';
import type {
	DeliveryProduct,
	DeliveryProductSpecification,
} from '~/types/product';

const CHANNEL_PRODUCTS_DEDUPING_INTERVAL = 300000;

const MAX_PAGES = 20;

const PAGE_SIZE = 100;

const RESTRICTED_PRODUCT_FIELDS = [
	'attachments',
	'catalogName',
	'createDate',
	'customFields',
	'expando',
	'images',
	'metaDescription',
	'metaKeyword',
	'metaTitle',
	'modifiedDate',
	'productConfiguration',
	'productSpecifications.id',
	'productSpecifications.optionCategoryId',
	'productSpecifications.priority',
	'productSpecifications.productId',
	'productSpecifications.specificationGroupKey',
	'productSpecifications.specificationGroupTitle',
	'productSpecifications.specificationId',
	'productSpecifications.specificationPriority',
	'productSpecifications.specificationTitle',
	'productType',
	'shortDescription',
	'skus.availability',
	'skus.backOrderAllowed',
	'skus.customFields',
	'skus.depth',
	'skus.discontinued',
	'skus.displayDate',
	'skus.displayDiscountLevels',
	'skus.gtin',
	'skus.height',
	'skus.id',
	'skus.incomingQuantityLabel',
	'skus.manufacturerPartNumber',
	'skus.price',
	'skus.productConfiguration',
	'skus.productId',
	'skus.published',
	'skus.purchasable',
	'skus.sku',
	'skus.skuOptions',
	'skus.skuUnitOfMeasures',
	'skus.tierPrices',
	'skus.weight',
	'skus.width',
	'slug',
	'tags',
	'urlImage',
	'urls',
].join(',');

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
	description: string;
	externalReferenceCode: string;
	id: string;
	name: string;
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
		displayName?: string;
		skuExternalReferenceCode?: string;
	};
	externalReferenceCode: string;
	name: string;
};

type ContractNode = {
	contractTerm?: number;
	contractToEntitlement?: EntitlementNode[];
	endDate?: string;
	externalReferenceCode: string;
	id: number;
	r_projectToContract_c_projectId?: number;
	spendLimit?: number;
	startDate?: string;
};

type ProjectNode = {
	name?: string;
	projectToContract?: ContractNode[];
};

type ProductEntitlement = {
	endDate?: string;
	skuExternalReferenceCode?: string;
};

function toProjectContract(contractNode: ContractNode): ProjectContract {
	return {
		endDate: contractNode.endDate,
		externalReferenceCode: contractNode.externalReferenceCode,
		name: contractNode.externalReferenceCode,
		spendLimit: contractNode.spendLimit,
		startDate: contractNode.startDate,
		status: getContractStatus(contractNode.startDate, contractNode.endDate),
		termMonths: contractNode.contractTerm,
	};
}

export function resolveDefaultContractERC(
	contracts: ProjectContract[]
): string | undefined {
	const activeContracts = contracts.filter(
		(contract) => contract.status === 'active'
	);

	const selectableContracts = activeContracts.length
		? activeContracts
		: contracts;

	if (!selectableContracts.length) {
		return undefined;
	}

	return selectableContracts.reduce((costliest, contract) =>
		(contract.spendLimit ?? 0) > (costliest.spendLimit ?? 0)
			? contract
			: costliest
	).externalReferenceCode;
}

function getEntitlementStatus(endDate?: string): string {
	if (endDate && new Date(endDate) < new Date()) {
		return 'expired';
	}

	return 'active';
}

function getContractStatus(startDate?: string, endDate?: string): string {
	const now = new Date();

	if (startDate && new Date(startDate) > now) {
		return 'future';
	}

	if (endDate && new Date(endDate) < now) {
		return 'expired';
	}

	return 'active';
}

function toProductEntitlements(
	entitlementNodes?: EntitlementNode[]
): ProductEntitlement[] {
	return (entitlementNodes ?? [])
		.map((entitlement) => ({
			endDate: entitlement.endDate,
			skuExternalReferenceCode:
				entitlement.entitlementDefinitionToEntitlement
					?.skuExternalReferenceCode,
		}))
		.filter((entitlement) => entitlement.skuExternalReferenceCode);
}

function toProductsBySkuExternalReferenceCode(
	products: DeliveryProduct[]
): Map<string, DeliveryProduct> {
	const productsBySkuExternalReferenceCode = new Map<
		string,
		DeliveryProduct
	>();

	products.forEach((product) =>
		(product.skus ?? []).forEach((sku) =>
			productsBySkuExternalReferenceCode.set(
				sku.externalReferenceCode,
				product
			)
		)
	);

	return productsBySkuExternalReferenceCode;
}

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

export function useChannelProducts() {
	const channelId = Liferay.CommerceContext.commerceChannelId;

	return useSWR(
		`/project-channel-products/${channelId}`,
		async () => {
			const getPage = (page: number) =>
				HeadlessCommerceDeliveryCatalog.getProductsPage(
					channelId,
					new URLSearchParams({
						'accountId': '-1',
						'nestedFields': 'productSpecifications,skus',
						'page': page.toString(),
						'pageSize': PAGE_SIZE.toString(),
						'restrictFields': RESTRICTED_PRODUCT_FIELDS,
						'skus.accountId': '-1',
						'skus.currencyCode':
							Liferay.CommerceContext.currency.currencyCode,
					})
				);

			const response = await getPage(1);

			const items = [...response.items];

			if (response.totalCount > items.length) {
				const lastPage = Math.min(
					Math.ceil(response.totalCount / PAGE_SIZE),
					MAX_PAGES
				);

				const remainingPages = await Promise.all(
					Array.from({length: lastPage - 1}, (_, index) =>
						getPage(index + 2)
					)
				);

				remainingPages.forEach((remainingPage) =>
					items.push(...remainingPage.items)
				);
			}

			return {...response, items};
		},
		{dedupingInterval: CHANNEL_PRODUCTS_DEDUPING_INTERVAL}
	);
}

export function useProjectCommerce(
	projectExternalReferenceCode: string,
	contractExternalReferenceCode?: string
) {
	const {
		data,
		error,
		isLoading: loading,
	} = useFetch<ProjectNode>(
		projectExternalReferenceCode
			? `/o/c/projects/by-external-reference-code/${projectExternalReferenceCode}`
			: null,
		{
			params: {
				nestedFields: 'projectToContract',
				nestedFieldsDepth: 1,
			},
		}
	);

	const {data: accountData, isLoading: accountLoading} =
		useAccountContracts();

	const projectContractNodes = data?.projectToContract ?? [];

	const {
		data: oneTimeEntitlementData,
		isLoading: oneTimeEntitlementsLoading,
	} = useFetch<APIResponse<EntitlementNode>>(
		data ? '/o/c/entitlements' : null,
		{
			params: {
				filter: [
					`r_projectToEntitlement_c_projectERC eq '${projectExternalReferenceCode}'`,
					...projectContractNodes.map(
						(node) =>
							`r_contractToEntitlement_c_contractId ne '${node.id}'`
					),
				].join(' and '),
				pageSize: 1,
			},
		}
	);

	const accountContractNodes = (accountData?.items ?? []).filter(
		(contract) => !contract.r_projectToContract_c_projectId
	);

	const usingAccountFallback = !projectContractNodes.length;

	const contractNodes = usingAccountFallback
		? accountContractNodes
		: projectContractNodes;

	const hasOneTimeEntitlements =
		Boolean(oneTimeEntitlementData?.totalCount) &&
		(!usingAccountFallback || !contractNodes.length);

	const contracts = [
		...contractNodes.map(toProjectContract),
		...(hasOneTimeEntitlements
			? [
					{
						externalReferenceCode: ONE_TIME_PURCHASES,
						name: i18n.translate('one-time-purchases'),
					},
				]
			: []),
	];

	const selectedContractExists = contracts.some(
		(contract) =>
			contract.externalReferenceCode === contractExternalReferenceCode
	);

	const resolvedContractERC = selectedContractExists
		? contractExternalReferenceCode
		: resolveDefaultContractERC(contracts);

	const oneTimeSelected = resolvedContractERC === ONE_TIME_PURCHASES;

	const contractNode = oneTimeSelected
		? undefined
		: contractNodes.find(
				(node) => node.externalReferenceCode === resolvedContractERC
			);

	const contract = contractNode ? toProjectContract(contractNode) : undefined;

	return {
		contract,
		contracts,
		error,
		loading: loading || accountLoading || oneTimeEntitlementsLoading,
		projectName: data?.name,
		usingAccountFallback,
	};
}

function useAccountContracts(enabled = true) {
	const accountId = Liferay.CommerceContext?.account?.accountId;

	return useFetch<APIResponse<ContractNode>>(
		enabled && accountId ? '/o/c/contracts' : null,
		{
			params: {
				filter: `r_accountEntryToContract_accountEntryId eq '${accountId}'`,
				pageSize: PAGE_SIZE,
			},
		}
	);
}

function useAccountContractEntitlements() {
	const accountId = Liferay.CommerceContext?.account?.accountId;

	return useFetch<APIResponse<ContractNode>>(
		accountId ? '/o/c/contracts' : null,
		{
			params: {
				filter: `r_accountEntryToContract_accountEntryId eq '${accountId}'`,
				nestedFields:
					'contractToEntitlement,entitlementDefinitionToEntitlement',
				nestedFieldsDepth: 2,
				pageSize: PAGE_SIZE,
			},
		}
	);
}

export function useUnassignedCommerce(enabled = true) {
	const {
		data: contractData,
		error: contractError,
		isLoading: contractLoading,
	} = useAccountContracts(enabled);

	const projectlessContractNodes = (contractData?.items ?? []).filter(
		(contract) => !contract.r_projectToContract_c_projectId
	);

	const {data, error, isLoading} = useFetch<APIResponse<EntitlementNode>>(
		projectlessContractNodes.length ? '/o/c/entitlements' : null,
		{
			params: {
				filter: [
					`(${projectlessContractNodes
						.map(
							(node) =>
								`r_contractToEntitlement_c_contractId eq '${node.id}'`
						)
						.join(' or ')})`,
					`r_projectToEntitlement_c_projectId eq '0'`,
					`r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId ne '0'`,
				].join(' and '),
				pageSize: 1,
			},
		}
	);

	return {
		error: contractError ?? error,
		hasUnassignedEntitlements: Boolean(data?.totalCount),
		loading: contractLoading || isLoading,
	};
}

export function useAccountProducts() {
	const {data: contractsData, isLoading: contractsLoading} =
		useAccountContractEntitlements();

	const {data: productsData, isLoading: productsLoading} =
		useChannelProducts();

	const products = useMemo<DeliveryProduct[]>(() => {
		const productsBySkuExternalReferenceCode =
			toProductsBySkuExternalReferenceCode(productsData?.items ?? []);

		const accountProducts = new Map<string, DeliveryProduct>();

		(contractsData?.items ?? []).forEach((contract) => {
			toProductEntitlements(contract.contractToEntitlement).forEach(
				(entitlement) => {
					const product = productsBySkuExternalReferenceCode.get(
						entitlement.skuExternalReferenceCode as string
					);

					if (product) {
						accountProducts.set(
							product.externalReferenceCode,
							product
						);
					}
				}
			);
		});

		return [...accountProducts.values()];
	}, [contractsData, productsData]);

	return {loading: contractsLoading || productsLoading, products};
}

export function useHasActiveExperienceOffering() {
	const {data, error, isLoading: loading} = useAccountContractEntitlements();

	const {
		data: productsData,
		error: productsError,
		isLoading: productsLoading,
	} = useChannelProducts();

	const hasActiveExperienceOffering = useMemo(() => {
		const productsBySkuExternalReferenceCode =
			toProductsBySkuExternalReferenceCode(productsData?.items ?? []);

		return (data?.items ?? [])
			.flatMap((contract) =>
				toProductEntitlements(contract.contractToEntitlement)
			)
			.some((entitlement) => {
				const product = productsBySkuExternalReferenceCode.get(
					entitlement.skuExternalReferenceCode as string
				);

				return (
					!!product &&
					EXPERIENCE_OFFERING_PRODUCT_EXTERNAL_REFERENCE_CODES.some(
						(code) => code === product.externalReferenceCode
					) &&
					getEntitlementStatus(entitlement.endDate) === 'active'
				);
			});
	}, [data, productsData]);

	return {
		error: error ?? productsError,
		hasActiveExperienceOffering,
		loading: loading || productsLoading,
	};
}

export function useAccountProjectContactRoles() {
	const {data: contractsData, isLoading: contractsLoading} =
		useAccountContractEntitlements();

	const {data: productsData, isLoading: productsLoading} =
		useChannelProducts();

	const contactRoleExternalReferenceCodesByProjectId = useMemo(() => {
		const productsBySkuExternalReferenceCode =
			toProductsBySkuExternalReferenceCode(productsData?.items ?? []);

		const externalReferenceCodesByProjectId = new Map<
			number,
			Set<string>
		>();

		(contractsData?.items ?? []).forEach((contract) => {
			const projectId = contract.r_projectToContract_c_projectId;

			if (!projectId) {
				return;
			}

			const externalReferenceCodes =
				externalReferenceCodesByProjectId.get(projectId) ??
				new Set<string>();

			toProductEntitlements(contract.contractToEntitlement).forEach(
				(entitlement) => {
					const product = productsBySkuExternalReferenceCode.get(
						entitlement.skuExternalReferenceCode as string
					);

					if (!product) {
						return;
					}

					getProductContactRoleExternalReferenceCodes(
						product.productSpecifications ?? []
					).forEach((externalReferenceCode) =>
						externalReferenceCodes.add(externalReferenceCode)
					);
				}
			);

			externalReferenceCodesByProjectId.set(
				projectId,
				externalReferenceCodes
			);
		});

		return new Map(
			[...externalReferenceCodesByProjectId].map(
				([projectId, externalReferenceCodes]) => [
					projectId,
					[...externalReferenceCodes],
				]
			)
		);
	}, [contractsData, productsData]);

	return {
		contactRoleExternalReferenceCodesByProjectId,
		loading: contractsLoading || productsLoading,
	};
}
