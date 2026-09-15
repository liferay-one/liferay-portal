/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import useSWR from 'swr';
import {EXPERIENCE_OFFERING_PRODUCT_EXTERNAL_REFERENCE_CODES} from '~/enums/Product';
import {useDataQuery} from '~/hooks/useDataQuery';
import i18n from '~/i18n';
import {getProductContactRoleExternalReferenceCodes} from '~/pages/MyAccount/ProjectMembers/projectRoles';
import {useUserProjects} from '~/pages/MyAccount/Projects/hooks/useUserProjects';
import {
	ONE_TIME_PURCHASES,
	isUnassignedProject,
} from '~/pages/MyAccount/Projects/projects';
import fetcher from '~/services/fetcher/fetcher';
import {queryGraphQL, toGraphQLString} from '~/services/graphql/GraphQL';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import {Liferay} from '~/services/liferay/liferay';
import SearchBuilder from '~/utils/SearchBuilder';

import type {APIResponse, DataQuery} from '~/types/api';
import type {
	DeliveryProduct,
	DeliveryProductSpecification,
} from '~/types/product';

const CHANNEL_PRODUCTS_DEDUPING_INTERVAL = 60000;

const FILTER_VALUE_REGEXP = /^[A-Za-z0-9_-]+$/;

const MAX_FILTER_CLAUSES = 50;

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
	r_contractToEntitlement_c_contractId?: number;
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

type ProductEntitlement = {
	endDate?: string;
	skuExternalReferenceCode?: string;
};

async function fetchAllPages<Item>(
	getPage: (page: number) => Promise<APIResponse<Item>>
): Promise<APIResponse<Item>> {
	const response = await getPage(1);

	const items = [...response.items];

	if (response.totalCount > items.length) {
		const lastPage = Math.min(
			Math.ceil(response.totalCount / PAGE_SIZE),
			MAX_PAGES
		);

		const remainingPages = await Promise.all(
			Array.from({length: lastPage - 1}, (_, index) => getPage(index + 2))
		);

		remainingPages.forEach((remainingPage) =>
			items.push(...remainingPage.items)
		);
	}

	return {...response, items};
}

function isFilterValue(value: string): boolean {
	return FILTER_VALUE_REGEXP.test(value);
}

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

export function channelProductsQuery(
	channelId: number | string
): DataQuery<APIResponse<DeliveryProduct>> {
	return {
		fetcher: async () => {
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
		key: `/project-channel-products/${channelId}`,
	};
}

export function useChannelProducts() {
	return useDataQuery(
		channelProductsQuery(Liferay.CommerceContext.commerceChannelId),
		{dedupingInterval: CHANNEL_PRODUCTS_DEDUPING_INTERVAL}
	);
}

export function useProjectCommerce(
	projectExternalReferenceCode: string,
	contractExternalReferenceCode?: string
) {
	const {loading: projectsLoading, projects} = useUserProjects();

	const project = projects.find(
		(userProject) =>
			userProject.externalReferenceCode === projectExternalReferenceCode
	);

	const {
		data: projectContractData,
		error: projectContractError,
		isLoading: projectContractsLoading,
	} = useProjectContracts(projectExternalReferenceCode);

	const {
		data: accountContractData,
		error,
		isLoading: accountLoading,
	} = useAccountLevelContracts(Boolean(projectExternalReferenceCode));

	const projectContractNodes = projectContractData?.items ?? [];

	const accountContractNodes = accountContractData?.items ?? [];

	const usingAccountFallback = !projectContractNodes.length;

	const contractNodes = usingAccountFallback
		? accountContractNodes
		: projectContractNodes;

	const countsOneTimeEntitlements =
		!usingAccountFallback || !contractNodes.length;

	const {entitlements, loading: entitlementsLoading} = useProjectEntitlements(
		projectExternalReferenceCode
	);

	const projectContractIds = new Set(
		projectContractNodes.map((node) => node.id)
	);

	const hasOneTimeEntitlements =
		countsOneTimeEntitlements &&
		entitlements.some(
			(entitlement) =>
				!projectContractIds.has(
					entitlement.r_contractToEntitlement_c_contractId ?? 0
				)
		);

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
		error: error ?? projectContractError,
		loading:
			accountLoading ||
			entitlementsLoading ||
			projectContractsLoading ||
			projectsLoading,
		projectContractIds,
		projectName: project?.name,
		resolvedContractERC,
		resolvedContractId: contractNode?.id,
		usingAccountFallback,
	};
}

const CONTRACT_FIELDS =
	'contractTerm endDate externalReferenceCode id spendLimit startDate';

function getAccountContractsPage(
	accountId: number | string | null | undefined,
	page: number,
	params: Record<string, string> = {}
) {
	return fetcher<APIResponse<ContractNode>>(
		`/o/c/contracts?${new URLSearchParams({
			...params,
			filter: SearchBuilder.eq(
				'r_accountEntryToContract_accountEntryId',
				accountId as number
			),
			page: page.toString(),
			pageSize: PAGE_SIZE.toString(),
		})}`
	);
}

export function projectEntitlementsQuery(
	projectExternalReferenceCode: string
): DataQuery<APIResponse<EntitlementNode>> {
	const enabled =
		Boolean(projectExternalReferenceCode) &&
		!isUnassignedProject(projectExternalReferenceCode) &&
		isFilterValue(projectExternalReferenceCode);

	return {
		fetcher: () =>
			fetchAllPages((page) =>
				fetcher<APIResponse<EntitlementNode>>(
					`/o/c/entitlements?${new URLSearchParams({
						fields: 'entitlementDefinitionToEntitlement.skuExternalReferenceCode,externalReferenceCode,r_contractToEntitlement_c_contractId',
						filter: SearchBuilder.eq(
							'r_projectToEntitlement_c_projectERC',
							projectExternalReferenceCode
						),
						nestedFields: 'entitlementDefinitionToEntitlement',
						nestedFieldsDepth: '1',
						page: page.toString(),
						pageSize: PAGE_SIZE.toString(),
					})}`
				)
			),
		key: enabled
			? `/project-entitlements/${projectExternalReferenceCode}`
			: null,
	};
}

export function useProjectEntitlements(projectExternalReferenceCode: string) {
	const {data, error, isLoading} = useDataQuery(
		projectEntitlementsQuery(projectExternalReferenceCode)
	);

	return {
		entitlements: data?.items ?? [],
		error,
		loading: isLoading,
	};
}

function countEntitlements(filter: string) {
	return queryGraphQL<{entitlements: {totalCount: number}}>(
		`c { entitlements(filter: ${toGraphQLString(
			filter
		)}, pageSize: 1) { totalCount } }`
	).then((data) => Boolean(data.entitlements.totalCount));
}

function getContractsPage(filter: string, page: number) {
	return queryGraphQL<{contracts: APIResponse<ContractNode>}>(
		`c { contracts(filter: ${toGraphQLString(
			filter
		)}, page: ${page}, pageSize: ${PAGE_SIZE}) { items { ${CONTRACT_FIELDS} } totalCount } }`
	).then((data) => data.contracts);
}

export function projectContractsQuery(
	projectExternalReferenceCode: string
): DataQuery<APIResponse<ContractNode>> {
	const enabled =
		Boolean(projectExternalReferenceCode) &&
		!isUnassignedProject(projectExternalReferenceCode) &&
		isFilterValue(projectExternalReferenceCode);

	return {
		fetcher: () =>
			fetchAllPages((page) =>
				getContractsPage(
					SearchBuilder.eq(
						'r_projectToContract_c_projectERC',
						projectExternalReferenceCode
					),
					page
				)
			),
		key: enabled
			? `/graphql/project-contracts/${projectExternalReferenceCode}`
			: null,
	};
}

export function accountLevelContractsQuery(
	accountId?: number | string | null
): DataQuery<APIResponse<ContractNode>> {
	return {
		fetcher: () =>
			fetchAllPages((page) =>
				getContractsPage(
					new SearchBuilder()
						.eq(
							'r_accountEntryToContract_accountEntryId',
							accountId as number
						)
						.and()
						.eq('r_projectToContract_c_projectId', '0')
						.build(),
					page
				)
			),
		key: accountId ? `/graphql/account-level-contracts/${accountId}` : null,
	};
}

function useProjectContracts(projectExternalReferenceCode: string) {
	return useDataQuery(projectContractsQuery(projectExternalReferenceCode));
}

function useAccountLevelContracts(enabled = true) {
	const accountId = Liferay.CommerceContext?.account?.accountId;

	return useDataQuery(accountLevelContractsQuery(enabled ? accountId : null));
}

function useAccountContractsWithEntitlements() {
	const accountId = Liferay.CommerceContext?.account?.accountId;

	return useSWR(
		accountId ? `/account-contract-entitlements/${accountId}` : null,
		() =>
			fetchAllPages((page) =>
				getAccountContractsPage(accountId, page, {
					nestedFields:
						'contractToEntitlement,entitlementDefinitionToEntitlement',
					nestedFieldsDepth: '2',
				})
			)
	);
}

export function useUnassignedCommerce(enabled = true) {
	const {
		data: contractData,
		error: contractError,
		isLoading: contractLoading,
	} = useAccountLevelContracts(enabled);

	const projectlessContractNodes = (contractData?.items ?? []).slice(
		0,
		MAX_FILTER_CLAUSES
	);

	const unassignedEntitlementFilter = projectlessContractNodes
		.reduce(
			(searchBuilder, node, index) =>
				index
					? searchBuilder
							.or()
							.eq('r_contractToEntitlement_c_contractId', node.id)
					: searchBuilder.eq(
							'r_contractToEntitlement_c_contractId',
							node.id
						),
			new SearchBuilder().group('OPEN')
		)
		.group('CLOSE')
		.and()
		.eq('r_projectToEntitlement_c_projectId', 0)
		.and()
		.ne('r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId', 0)
		.build();

	const {data, error, isLoading} = useSWR(
		projectlessContractNodes.length
			? `/graphql/unassigned-entitlements/${unassignedEntitlementFilter}`
			: null,
		() => countEntitlements(unassignedEntitlementFilter)
	);

	return {
		error: contractError ?? error,
		hasUnassignedEntitlements: Boolean(data),
		loading: contractLoading || isLoading,
	};
}

export function useAccountProducts() {
	const {data: contractsData, isLoading: contractsLoading} =
		useAccountContractsWithEntitlements();

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
	const {
		data,
		error,
		isLoading: loading,
	} = useAccountContractsWithEntitlements();

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
		useAccountContractsWithEntitlements();

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
