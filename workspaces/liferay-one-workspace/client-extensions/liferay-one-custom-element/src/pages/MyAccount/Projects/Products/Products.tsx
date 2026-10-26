/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useNavigate, useParams} from 'react-router';
import {RowAction} from '~/components/RowActionsMenu/RowActionsMenu';
import {ProjectProduct} from '~/hooks/useProjectCommerce';
import {useProjectContractItems} from '~/hooks/useProjectItems';
import {
	ListColumn,
	ListFilter,
} from '~/pages/MyAccount/Projects/components/FilterableListCard/FilterableListCard';
import ProductListPage, {
	statusColumn,
	statusFilter,
} from '~/pages/MyAccount/Projects/components/ProductListPage/ProductListPage';
import {isFreeActivationKeyProduct} from '~/pages/MyAccount/Projects/utils/isFreeActivationKeyProduct';

export default function Products() {
	const {accountERC, projectERC} = useParams();
	const navigate = useNavigate();
	const {error, loading, products} = useProjectContractItems();

	const filters = useMemo<ListFilter<ProjectProduct>[]>(
		() => [statusFilter(products)],
		[products]
	);

	const renderExtraActions = (product: ProjectProduct): RowAction[] =>
		isFreeActivationKeyProduct(product.specifications)
			? [
					{
						label: 'view-activation-key',
						onClick: () =>
							navigate(
								`/${accountERC}/project/${projectERC}/activation`
							),
					},
				]
			: [];

	const columns: ListColumn<ProjectProduct>[] = [
		{
			expanded: true,
			heading: 'name',
			key: 'name',
			render: (product) => (
				<span className="list-card-name-label">{product.name}</span>
			),
			sortValue: (product) => product.name,
		},
		{
			heading: 'start-date',
			key: 'start-date',
			noWrap: true,
			render: (product) => product.startDate,
			sortValue: (product) => Date.parse(product.startDate) || 0,
			width: '1%',
		},
		statusColumn(),
	];

	return (
		<ProductListPage
			columns={columns}
			description="manage-the-products-within-your-project"
			emptyLabel="no-products-yet"
			error={error}
			filters={filters}
			items={products}
			loading={loading}
			onItemClick={(product) => navigate(product.externalReferenceCode)}
			renderExtraActions={renderExtraActions}
			title="products"
		/>
	);
}
