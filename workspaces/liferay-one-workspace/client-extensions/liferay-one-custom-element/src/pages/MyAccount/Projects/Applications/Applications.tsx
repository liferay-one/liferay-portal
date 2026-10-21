/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useNavigate} from 'react-router';
import {RowAction} from '~/components/RowActionsMenu/RowActionsMenu';
import {ProductPriceModel} from '~/enums/Product';
import {ProjectProduct} from '~/hooks/useProjectCommerce';
import {useProjectItems} from '~/hooks/useProjectItems';
import {translate} from '~/i18n';
import {
	ListColumn,
	ListFilter,
} from '~/pages/MyAccount/Projects/components/FilterableListCard/FilterableListCard';
import ProductListPage, {
	statusColumn,
	statusFilter,
} from '~/pages/MyAccount/Projects/components/ProductListPage/ProductListPage';
import DeliveryOrderModel from '~/services/models/DeliveryOrderModel';

export default function Applications() {
	const navigate = useNavigate();
	const {applications, error, loading, orderByProductExternalReferenceCode} =
		useProjectItems();

	const filters = useMemo<ListFilter<ProjectProduct>[]>(() => {
		const saleTypes = Array.from(
			new Set(applications.map((application) => application.saleType))
		).sort();

		return [
			{
				key: 'sale-type',
				label: 'sale-type',
				matches: (application, values) =>
					values.includes(application.saleType),
				options: saleTypes.map((saleType) => ({
					label: saleType || translate('none'),
					value: saleType,
				})),
			},
			statusFilter(applications),
		];
	}, [applications]);

	const renderExtraActions = (application: ProjectProduct): RowAction[] => {
		const order = orderByProductExternalReferenceCode.get(
			application.externalReferenceCode
		);

		if (!order) {
			return [];
		}

		const {canDownload, isCloudApp, isLicensable, isOrderCompleted} =
			new DeliveryOrderModel(order);
		const canGenerateLicenses =
			isLicensable && application.saleType !== ProductPriceModel.FREE;
		const activationPath = '../activation';
		const actions: RowAction[] = [];

		if (canGenerateLicenses) {
			actions.push(
				{
					disabled: !isOrderCompleted,
					label: 'create-license-key',
					onClick: () =>
						navigate(
							`${activationPath}?new=${encodeURIComponent(application.externalReferenceCode)}`
						),
					title: isOrderCompleted
						? undefined
						: translate(
								'the-order-must-be-completed-before-licensing-this-app.'
							),
				},
				{
					label: 'manage-license-keys',
					onClick: () => navigate(activationPath),
				}
			);
		}

		if (canDownload) {
			actions.push({
				disabled: !isOrderCompleted,
				label: 'download-app',
				onClick: () =>
					navigate(
						`${application.externalReferenceCode}?tab=download`
					),
				title: isOrderCompleted
					? undefined
					: translate(
							'this-order-must-be-completed-before-downloading-this-app.'
						),
			});
		}

		if (isCloudApp) {
			actions.push({
				label: 'cloud-provisioning',
				onClick: () =>
					navigate(
						`${application.externalReferenceCode}/install/${order.id}`
					),
			});
		}

		return actions;
	};

	const columns: ListColumn<ProjectProduct>[] = [
		{
			expanded: true,
			heading: 'name',
			key: 'name',
			render: (application) => (
				<span className="list-card-name-label">{application.name}</span>
			),
		},
		{
			heading: 'provided-by',
			key: 'provided-by',
			render: (application) => (
				<span className="d-flex flex-column">
					<span>{application.publisher}</span>

					<span className="list-card-subtext">
						{application.startDate}
					</span>
				</span>
			),
			width: '1%',
		},
		{
			heading: 'sale-type',
			key: 'sale-type',
			render: (application) => application.saleType,
			width: '1%',
		},
		{
			heading: 'order-id',
			key: 'order-id',
			render: (application) =>
				orderByProductExternalReferenceCode
					.get(application.externalReferenceCode)
					?.id.toString() ?? '-',
			width: '1%',
		},
		statusColumn(),
	];

	return (
		<ProductListPage
			columns={columns}
			description="manage-the-applications-within-your-project"
			emptyLabel="no-applications-yet"
			error={error}
			filters={filters}
			items={applications}
			loading={loading}
			onItemClick={(application) =>
				navigate(application.externalReferenceCode)
			}
			renderExtraActions={renderExtraActions}
			title="applications"
		/>
	);
}
