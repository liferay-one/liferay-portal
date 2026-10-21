/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useNavigate} from 'react-router';
import {RowAction} from '~/components/RowActionsMenu/RowActionsMenu';
import {ProjectProduct} from '~/hooks/useProjectCommerce';
import {useProjectContractItems} from '~/hooks/useProjectItems';
import i18n from '~/i18n';
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
	const navigate = useNavigate();
	const {error, loading, products} = useProjectContractItems();

	const filters = useMemo<ListFilter<ProjectProduct>[]>(() => {
		const types = Array.from(
			new Set(products.map((product) => product.type))
		).sort();

		return [
			{
				key: 'type',
				label: 'type',
				matches: (product, values) => values.includes(product.type),
				options: types.map((type) => ({
					label: type || i18n.translate('none'),
					value: type,
				})),
			},
			statusFilter(products),
		];
	}, [products]);

	const renderExtraActions = (product: ProjectProduct): RowAction[] =>
		isFreeActivationKeyProduct(product.specifications)
			? [
					{
						label: 'view-activation-key',
						onClick: () => navigate('../activation'),
					},
				]
			: [];

	const columns: ListColumn<ProjectProduct>[] = [
		{
			expanded: true,
			heading: 'name',
			key: 'name',
			render: (product) => (
				<span className="list-card-name-text">
					<span className="list-card-name-label">{product.name}</span>

					<span className="list-card-subtext">
						{i18n.sub('by-x', product.publisher)}
					</span>
				</span>
			),
		},
		{
			heading: 'type',
			key: 'type',
			render: (product) => product.type,
			width: '1%',
		},
		{
			heading: 'start-date',
			key: 'start-date',
			noWrap: true,
			render: (product) => product.startDate,
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
