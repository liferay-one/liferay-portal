/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useProject} from '~/context/ProjectContext';
import {
	useChannelProducts,
	useProjectCommerce,
	useProjectEntitlements,
} from '~/hooks/useProjectCommerce';
import {getProjectName, useProjectOrders} from '~/hooks/useProjectOrders';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/utils/constants';
import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';
import {
	toProductsByProductId,
	toProjectItemsByType,
} from '~/pages/MyAccount/Projects/utils/projectItemsUtils';

import type {ProjectProduct} from '~/hooks/useProjectCommerce';
import type {ProjectItemType} from '~/pages/MyAccount/Projects/types';
import type {PlacedOrder} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

export function useProjectsWithProjectItemType(
	projectItemType: ProjectItemType
) {
	const {projects} = useProject();

	const {data: channelProducts, isLoading: productsLoading} =
		useChannelProducts();
	const {loading: ordersLoading, placedOrders} = useProjectOrders();

	const productsByProductId = useMemo(
		() => toProductsByProductId(channelProducts?.items ?? []),
		[channelProducts]
	);

	const projectERCs = useMemo(() => {
		const ordersByProjectName = new Map<string, PlacedOrder[]>();

		for (const order of placedOrders) {
			const projectName = getProjectName(order);

			const orders = ordersByProjectName.get(projectName);

			if (orders) {
				orders.push(order);
			}
			else {
				ordersByProjectName.set(projectName, [order]);
			}
		}

		return projects
			.filter((project) => {
				const orders =
					ordersByProjectName.get(
						isUnassignedProject(project.externalReferenceCode)
							? ''
							: project.name
					) ?? [];

				const itemsByProjectItemType = toProjectItemsByType(
					orders,
					productsByProductId
				);

				return Boolean(itemsByProjectItemType[projectItemType].size);
			})
			.map((project) => project.externalReferenceCode);
	}, [placedOrders, productsByProductId, projectItemType, projects]);

	return {
		loading: ordersLoading || productsLoading,
		projectERCs,
	};
}

export function useProjectItems() {
	const {loading: projectLoading, project, projectId} = useProject();

	const projectName = isUnassignedProject(projectId)
		? undefined
		: project?.name;

	const {
		data: channelProducts,
		error: productsError,
		isLoading: productsLoading,
	} = useChannelProducts();
	const {
		error: ordersError,
		loading: ordersLoading,
		placedOrders,
	} = useProjectOrders(projectName);

	const scopedOrders = useMemo(
		() =>
			isUnassignedProject(projectId)
				? placedOrders.filter((order) => !getProjectName(order))
				: placedOrders,
		[placedOrders, projectId]
	);

	const productsByProductId = useMemo(
		() => toProductsByProductId(channelProducts?.items ?? []),
		[channelProducts]
	);

	const {applications, products} = useMemo(() => {
		const itemsByProjectItemType = toProjectItemsByType(
			scopedOrders,
			productsByProductId
		);

		return {
			applications: [...itemsByProjectItemType.application.values()],
			products: [...itemsByProjectItemType.product.values()],
		};
	}, [productsByProductId, scopedOrders]);

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

function toProductExternalReferenceCodesByEntitledExternalReferenceCode(
	products: DeliveryProduct[]
) {
	const productExternalReferenceCodes = new Map<string, string>();

	for (const product of products) {
		productExternalReferenceCodes.set(
			product.externalReferenceCode,
			product.externalReferenceCode
		);
	}

	for (const product of products) {
		for (const sku of product.skus ?? []) {
			productExternalReferenceCodes.set(
				sku.externalReferenceCode,
				product.externalReferenceCode
			);
		}
	}

	return productExternalReferenceCodes;
}

export function useProjectContractItems() {
	const {projectId, selectedContractERC} = useProject();

	const projectItems = useProjectItems();

	const {data: channelProducts} = useChannelProducts();

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

	const {entitlements, loading: entitlementsLoading} = useProjectEntitlements(
		isUnassignedProject(projectId) ? '' : projectId
	);

	const contractProductExternalReferenceCodes = useMemo(() => {
		const productExternalReferenceCodes =
			toProductExternalReferenceCodesByEntitledExternalReferenceCode(
				channelProducts?.items ?? []
			);

		const entitled = new Set<string>();
		const entitledUnderAnyContract = new Set<string>();

		for (const entitlement of entitlements) {
			const externalReferenceCode = productExternalReferenceCodes.get(
				entitlement.entitlementDefinitionToEntitlement
					?.skuExternalReferenceCode ?? ''
			);

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
		channelProducts,
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
