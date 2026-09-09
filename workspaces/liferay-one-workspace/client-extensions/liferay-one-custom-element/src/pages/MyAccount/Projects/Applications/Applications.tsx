/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {RowAction} from '~/components/RowActionsMenu/RowActionsMenu';
import {useProject} from '~/context/ProjectContext';
import {useProjectApplications} from '~/hooks/useProjectApplications';
import {ProjectProduct} from '~/hooks/useProjectCommerce';
import {Word, translate} from '~/i18n';
import DeliveryOrderModel from '~/models/DeliveryOrderModel';
import {
	ListColumn,
	ListFilter,
} from '~/pages/MyAccount/Projects/components/FilterableListCard/FilterableListCard';
import ProductListPage, {
	statusColumn,
	statusFilter,
} from '~/pages/MyAccount/Projects/components/ProductListPage/ProductListPage';
import {getLogoColor} from '~/pages/MyAccount/Projects/utils/getLogoColor';
import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';

export default function Applications() {
	const navigate = useNavigate();
	const {project, projectId} = useProject();

	const projectName = isUnassignedProject(projectId)
		? undefined
		: project?.name;

	const {
		applications,
		error,
		loading,
		orderByProductName,
		orderIdByProductName,
	} = useProjectApplications(projectId, projectName);

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
					label: saleType,
					value: saleType,
				})),
			},
			statusFilter(applications),
		];
	}, [applications]);

	const renderActions = (application: ProjectProduct): RowAction[] => {
		const actions: RowAction[] = [
			{
				label: 'view-details',
				onClick: () => navigate(application.externalReferenceCode),
			},
		];

		const order = orderByProductName.get(application.externalReferenceCode);

		if (!order) {
			return actions;
		}

		const deliveryOrder = new DeliveryOrderModel(order);
		const {canDownload, canGenerateLicenses, isFreeApp, isOrderCompleted} =
			deliveryOrder;
		const orderId = order.id;

		if (canGenerateLicenses) {
			actions.push(
				{
					disabled: !isOrderCompleted,
					label: 'create-license-key',
					onClick: () =>
						navigate(
							`${application.externalReferenceCode}?tab=activation`
						),
					title: isOrderCompleted
						? undefined
						: translate(
								'the-order-must-be-completed-before-licensing-this-app.' as Word
							),
				},
				{
					disabled: isFreeApp,
					label: 'manage-license-keys',
					onClick: () =>
						navigate(
							`${application.externalReferenceCode}?tab=activation`
						),
				}
			);
		}

		if (!canDownload) {
			actions.push({
				label: 'cloud-provisioning',
				onClick: () =>
					navigate(
						`${application.externalReferenceCode}/install/${orderId}`
					),
			});
		}

		if (canDownload) {
			actions.push({
				disabled: !isOrderCompleted,
				label: 'download-app',
				onClick: () =>
					navigate(
						`${application.externalReferenceCode}?tab=download`
					),
				title: !isOrderCompleted
					? translate(
							'this-order-must-be-completed-before-downloading-this-app.' as Word
						)
					: undefined,
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
				<span className="list-card-name">
					<span
						className="list-card-icon"
						style={{
							backgroundColor: getLogoColor(application.name),
						}}
					>
						{application.name.charAt(0)}
					</span>

					<span className="list-card-name-label">
						{application.name}
					</span>
				</span>
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
				orderIdByProductName.get(application.externalReferenceCode) ??
				'-',
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
			renderActions={renderActions}
			title="applications"
		/>
	);
}
