/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useProject} from '~/context/ProjectContext';
import {useChannelProducts} from '~/hooks/useProjectCommerce';
import {getProjectName, useProjectOrders} from '~/hooks/useProjectOrders';
import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';
import {
	toProductsByProductId,
	toProjectItemsByType,
} from '~/pages/MyAccount/Projects/utils/projectItemsUtils';

import type {PlacedOrder} from '~/types/orders';

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
