/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import useSWR from 'swr';
import {EXPERIENCE_OFFERING_PRODUCT_EXTERNAL_REFERENCE_CODES} from '~/enums/Product';
import {useCurrentAccount} from '~/hooks/useAccounts';
import {useDataQuery} from '~/hooks/useDataQuery';
import {useProjectOrders} from '~/hooks/useProjectOrders';
import i18n from '~/i18n';
import {getProductContactRoleExternalReferenceCodes} from '~/pages/MyAccount/ProjectMembers/projectRoles';
import {useUserProjects} from '~/pages/MyAccount/Projects/hooks/useUserProjects';
import {
	ONE_TIME_PURCHASES,
	isUnassignedProject,
} from '~/pages/MyAccount/Projects/projects';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import fetcher from '~/services/fetcher/fetcher';
import {queryGraphQL, toGraphQLString} from '~/services/graphql/GraphQL';
import {Liferay} from '~/services/liferay/liferay';
import Accounts from '~/services/spring-boot/Accounts';
import {OrderCustomFields} from '~/utils/orderUtils';
import {getProductSpecificationValue} from '~/utils/productUtils';

import type {APIResponse, DataQuery} from '~/types/api';
import type {
	DeliveryProduct,
	DeliveryProductSpecification,
} from '~/types/product';

const BASE_PRODUCT_TYPE = 'primary';

const FILTER_VALUE_REGEXP = /^[A-Za-z0-9_-]+$/;

const MAX_FILTER_CLAUSES = 50;

const MAX_PAGES = 20;

const PAGE_SIZE = 100;

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
	externalReferenceCode: string;
	name: string;
	r_contractToEntitlement_c_contractId?: number;
	skuExternalReferenceCode?: string;
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

function isBaseProduct(product?: DeliveryProduct): boolean {
	return (
		!!product &&
		getProductSpecificationValue('product-type', product) ===
			BASE_PRODUCT_TYPE
	);
}

export function resolveDefaultContractERC(
	baseContractERCs: Set<string>,
	contracts: ProjectContract[]
): string | undefined {
	const activeContracts = contracts.filter(
		(contract) => contract.status === 'active'
	);

	const selectableContracts = activeContracts.length
		? activeContracts
		: contracts;

	const baseContracts = selectableContracts.filter((contract) =>
		baseContractERCs.has(contract.externalReferenceCode)
	);

	const candidateContracts = baseContracts.length
		? baseContracts
		: selectableContracts;

	if (!candidateContracts.length) {
		return undefined;
	}

	return candidateContracts.reduce((costliest, contract) =>
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
			skuExternalReferenceCode: entitlement.skuExternalReferenceCode,
		}))
		.filter((entitlement) => entitlement.skuExternalReferenceCode);
}

export function toProductsByEntitledExternalReferenceCode(
	products: DeliveryProduct[]
): Map<string, DeliveryProduct> {
	const productsByEntitledExternalReferenceCode = new Map(
		products.map((product) => [product.externalReferenceCode, product])
	);

	toProductsBySkuExternalReferenceCode(products).forEach(
		(product, skuExternalReferenceCode) =>
			productsByEntitledExternalReferenceCode.set(
				skuExternalReferenceCode,
				product
			)
	);

	return productsByEntitledExternalReferenceCode;
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

export function projectProductsQuery(
	accountExternalReferenceCode?: string
): DataQuery<APIResponse<DeliveryProduct>> {
	return {
		fetcher: () =>
			Accounts.getProducts(accountExternalReferenceCode as string),
		key: accountExternalReferenceCode
			? `/project-products/${accountExternalReferenceCode}`
			: null,
	};
}

export function useProjectProducts() {
	const {
		data: account,
		error: accountError,
		isLoading: accountLoading,
	} = useCurrentAccount();

	const {data, error, isLoading, mutate} = useDataQuery(
		projectProductsQuery(account?.externalReferenceCode)
	);

	return {
		data,
		error: error ?? accountError,
		isLoading: isLoading || accountLoading,
		mutate,
	};
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

	const projectContractNodes = useMemo(
		() => projectContractData?.items ?? [],
		[projectContractData]
	);

	const accountContractNodes = useMemo(
		() => accountContractData?.items ?? [],
		[accountContractData]
	);

	const usingAccountFallback = !projectContractNodes.length;

	const contractNodes = usingAccountFallback
		? accountContractNodes
		: projectContractNodes;

	const countsOneTimeEntitlements =
		!usingAccountFallback || !contractNodes.length;

	const {
		entitlements,
		error: entitlementsError,
		loading: entitlementsLoading,
	} = useProjectEntitlements(projectExternalReferenceCode);

	const {
		error: ordersError,
		loading: ordersLoading,
		placedOrders,
	} = useProjectOrders(project);

	const {data: productsData, isLoading: productsLoading} =
		useProjectProducts();

	const listedContractNodes = useMemo(() => {
		if (!project || entitlementsError || ordersError) {
			return contractNodes;
		}

		const contractIds = new Set<number>();

		entitlements.forEach((entitlement) => {
			if (entitlement.r_contractToEntitlement_c_contractId) {
				contractIds.add(
					entitlement.r_contractToEntitlement_c_contractId
				);
			}
		});

		placedOrders.forEach((placedOrder) => {
			const contractId = Number(
				placedOrder.customFields?.[OrderCustomFields.CONTRACT_ID]
			);

			if (contractId) {
				contractIds.add(contractId);
			}
		});

		return contractNodes.filter((node) => contractIds.has(node.id));
	}, [
		contractNodes,
		entitlements,
		entitlementsError,
		ordersError,
		placedOrders,
		project,
	]);

	const projectContractIds = useMemo(
		() => new Set(projectContractNodes.map((node) => node.id)),
		[projectContractNodes]
	);

	const hasOneTimeEntitlements =
		countsOneTimeEntitlements &&
		entitlements.some(
			(entitlement) =>
				!projectContractIds.has(
					entitlement.r_contractToEntitlement_c_contractId ?? 0
				)
		);

	const contracts = useMemo<ProjectContract[]>(
		() => [
			...listedContractNodes.map(toProjectContract),
			...(hasOneTimeEntitlements
				? [
						{
							externalReferenceCode: ONE_TIME_PURCHASES,
							name: i18n.translate('one-time-purchases'),
						},
					]
				: []),
		],
		[hasOneTimeEntitlements, listedContractNodes]
	);

	const productsByEntitledExternalReferenceCode = useMemo(
		() =>
			toProductsByEntitledExternalReferenceCode(
				productsData?.items ?? []
			),
		[productsData]
	);

	const contractERCsByProductERC = useMemo(() => {
		const contractERCsById = new Map(
			contractNodes.map((node) => [node.id, node.externalReferenceCode])
		);

		const contractERCsByProductERC = new Map<string, Set<string>>();

		for (const entitlement of entitlements) {
			const product = productsByEntitledExternalReferenceCode.get(
				entitlement.skuExternalReferenceCode ?? ''
			);

			if (!product) {
				continue;
			}

			const contractERCs =
				contractERCsByProductERC.get(product.externalReferenceCode) ??
				new Set<string>();

			contractERCs.add(
				contractERCsById.get(
					entitlement.r_contractToEntitlement_c_contractId ?? 0
				) ?? ONE_TIME_PURCHASES
			);

			contractERCsByProductERC.set(
				product.externalReferenceCode,
				contractERCs
			);
		}

		return contractERCsByProductERC;
	}, [contractNodes, entitlements, productsByEntitledExternalReferenceCode]);

	const baseContractERCs = useMemo(() => {
		const baseContractERCs = new Set<string>();

		contractERCsByProductERC.forEach((contractERCs, productERC) => {
			if (
				isBaseProduct(
					productsByEntitledExternalReferenceCode.get(productERC)
				)
			) {
				contractERCs.forEach((contractERC) =>
					baseContractERCs.add(contractERC)
				);
			}
		});

		return baseContractERCs;
	}, [contractERCsByProductERC, productsByEntitledExternalReferenceCode]);

	const selectedContractExists = contracts.some(
		(contract) =>
			contract.externalReferenceCode === contractExternalReferenceCode
	);

	const resolvedContractERC = selectedContractExists
		? contractExternalReferenceCode
		: resolveDefaultContractERC(baseContractERCs, contracts);

	const oneTimeSelected = resolvedContractERC === ONE_TIME_PURCHASES;

	const contractNode = oneTimeSelected
		? undefined
		: contractNodes.find(
				(node) => node.externalReferenceCode === resolvedContractERC
			);

	const contract = contractNode ? toProjectContract(contractNode) : undefined;

	return {
		contract,
		contractERCsByProductERC,
		contracts,
		error: error ?? projectContractError ?? entitlementsError,
		loading:
			accountLoading ||
			entitlementsLoading ||
			ordersLoading ||
			productsLoading ||
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
						fields: 'externalReferenceCode,r_contractToEntitlement_c_contractId,skuExternalReferenceCode',
						filter: SearchBuilder.eq(
							'r_projectToEntitlement_c_projectERC',
							projectExternalReferenceCode
						),
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

	const entitlements = useMemo(() => data?.items ?? [], [data]);

	return {
		entitlements,
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
					nestedFields: 'contractToEntitlement',
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
		useProjectProducts();

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
	} = useProjectProducts();

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
		useProjectProducts();

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
