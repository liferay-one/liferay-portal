/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useParams} from 'react-router';
import {useProject} from '~/context/ProjectContext';
import {
	toProductsByEntitledExternalReferenceCode,
	useProjectCommerce,
	useProjectEntitlements,
	useProjectProducts,
} from '~/hooks/useProjectCommerce';
import {hasProject, useProjectOrders} from '~/hooks/useProjectOrders';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/utils/constants';
import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';
import {
	toProductsByProductId,
	toProjectItemsByType,
} from '~/pages/MyAccount/Projects/utils/projectItemsUtils';

import type {ProjectProduct} from '~/hooks/useProjectCommerce';
import type {PlacedOrder} from '~/types/orders';

export function useProjectItems(contractId?: number) {
	const {loading: projectLoading, project, projectId} = useProject();

	const orderProject = isUnassignedProject(projectId) ? undefined : project;

	const {
		data: projectProducts,
		error: productsError,
		isLoading: productsLoading,
	} = useProjectProducts();
	const {
		error: ordersError,
		loading: ordersLoading,
		placedOrders,
	} = useProjectOrders(orderProject);

	const scopedOrders = useMemo(
		() =>
			isUnassignedProject(projectId)
				? placedOrders.filter((order) => !hasProject(order))
				: placedOrders,
		[placedOrders, projectId]
	);

	const productsByProductId = useMemo(
		() => toProductsByProductId(projectProducts?.items ?? []),
		[projectProducts]
	);

	const {applications, products} = useMemo(() => {
		const itemsByProjectItemType = toProjectItemsByType(
			scopedOrders,
			productsByProductId,
			contractId
		);

		return {
			applications: [...itemsByProjectItemType.application.values()],
			products: [...itemsByProjectItemType.product.values()],
		};
	}, [contractId, productsByProductId, scopedOrders]);

	const orderByProductExternalReferenceCode = useMemo(() => {
		const orders = new Map<string, PlacedOrder>();

		for (const order of scopedOrders) {
			for (const placedOrderItem of order.placedOrderItems ?? []) {
				const externalReferenceCode = productsByProductId.get(
					placedOrderItem.productId
				)?.externalReferenceCode;

				if (
					externalReferenceCode &&
					!orders.has(externalReferenceCode)
				) {
					orders.set(externalReferenceCode, order);
				}
			}
		}

		return orders;
	}, [productsByProductId, scopedOrders]);

	return {
		applications,
		error: productsError ?? ordersError,
		loading: ordersLoading || productsLoading || projectLoading,
		orderByProductExternalReferenceCode,
		products,
	};
}

export default useProjectItems;

export function useProjectContractItems() {
	const {projectId, selectedContractERC} = useProject();

	const {data: projectProducts} = useProjectProducts();

	const {
		loading: contractsLoading,
		projectContractIds,
		resolvedContractERC,
		resolvedContractId,
		usingAccountFallback,
	} = useProjectCommerce(
		isUnassignedProject(projectId) ? '' : projectId,
		selectedContractERC
	);

	const projectItems = useProjectItems(resolvedContractId);

	const {entitlements, loading: entitlementsLoading} = useProjectEntitlements(
		isUnassignedProject(projectId) ? '' : projectId
	);

	const contractProductExternalReferenceCodes = useMemo(() => {
		const productsByEntitledExternalReferenceCode =
			toProductsByEntitledExternalReferenceCode(
				projectProducts?.items ?? []
			);

		const entitled = new Set<string>();
		const entitledUnderAnyContract = new Set<string>();

		for (const entitlement of entitlements) {
			const externalReferenceCode =
				productsByEntitledExternalReferenceCode.get(
					entitlement.skuExternalReferenceCode ?? ''
				)?.externalReferenceCode;

			if (!externalReferenceCode) {
				continue;
			}

			const contractId =
				entitlement.r_contractToEntitlement_c_contractId ?? 0;

			if (projectContractIds.has(contractId)) {
				entitledUnderAnyContract.add(externalReferenceCode);
			}

			if (
				resolvedContractERC === ONE_TIME_PURCHASES
					? !projectContractIds.has(contractId)
					: contractId === resolvedContractId
			) {
				entitled.add(externalReferenceCode);
			}
		}

		return {entitled, entitledUnderAnyContract};
	}, [
		projectProducts,
		entitlements,
		projectContractIds,
		resolvedContractERC,
		resolvedContractId,
	]);

	const scoped = useMemo(() => {
		const keep = (item: ProjectProduct) =>
			contractProductExternalReferenceCodes.entitled.has(
				item.externalReferenceCode
			) ||
			(resolvedContractERC === ONE_TIME_PURCHASES &&
				!contractProductExternalReferenceCodes.entitledUnderAnyContract.has(
					item.externalReferenceCode
				));

		return {
			applications: projectItems.applications.filter(keep),
			products: projectItems.products.filter(keep),
		};
	}, [
		contractProductExternalReferenceCodes,
		projectItems.applications,
		projectItems.products,
		resolvedContractERC,
	]);

	if (usingAccountFallback || !resolvedContractERC) {
		return projectItems;
	}

	return {
		...projectItems,
		...scoped,
		loading:
			projectItems.loading || contractsLoading || entitlementsLoading,
	};
}

export function useProjectContractERC() {
	const {contractERC: requestedContractERC, productERC} = useParams();

	const {projectId, selectedContractERC} = useProject();

	const {
		contractERCsByProductERC,
		contracts,
		error,
		loading,
		resolvedContractERC,
		usingAccountFallback,
	} = useProjectCommerce(
		isUnassignedProject(projectId) ? '' : projectId,
		selectedContractERC
	);

	const contractExists = (contractERC?: string) =>
		contracts.some(
			(contract) => contract.externalReferenceCode === contractERC
		);

	if (contractExists(requestedContractERC)) {
		return {contractERC: requestedContractERC, error, loading};
	}

	const productContractERCs =
		productERC && !usingAccountFallback
			? [
					...(contractERCsByProductERC.get(productERC) ?? [
						ONE_TIME_PURCHASES,
					]),
				].filter(contractExists)
			: [];

	const productContractERC =
		resolvedContractERC && productContractERCs.includes(resolvedContractERC)
			? resolvedContractERC
			: productContractERCs[0];

	return {
		contractERC: productContractERC ?? resolvedContractERC,
		error,
		loading,
	};
}
