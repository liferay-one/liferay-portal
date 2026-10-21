/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import {useModal} from '@clayui/modal';
import {useState} from 'react';
import {useNavigate} from 'react-router';
import {useProperties} from '~/context/PropertiesContext';
import useModalContext from '~/hooks/useModalContext';
import i18n, {Word} from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import Console from '~/services/spring-boot/Console';

import ProvisioningDetails from '../ProvisioningDetails/ProvisioningDetails';
import {InstallStatus} from '../types';

import type {Account} from '~/types/accounts';
import type {PlacedOrder} from '~/types/orders';

import type {ProvisioningData, ProvisioningRow} from './useProvisioningData';

export type ProvisioningAction = {
	disabled?: boolean;
	label: Word;
	onClick: (provisioningRow: ProvisioningRow) => void;
	show: (provisioningRow: ProvisioningRow) => boolean;
};

type UseProvisioningActionsProps = {
	mutateOrder: ProvisioningData['mutateOrder'];
	order: PlacedOrder;
	resourceRequirements: ProvisioningData['resourceRequirements'];
	selectedAccount?: Account;
};

const getProvisioningStatus = (provisioningRow: ProvisioningRow) => ({
	inProgress: provisioningRow.status === InstallStatus.IN_PROGRESS,
	isExpired: provisioningRow.status === InstallStatus.EXPIRED,
	isInstalled: provisioningRow.status === InstallStatus.INSTALLED,
	readyToInstall: provisioningRow.status === InstallStatus.READY_TO_INSTALL,
});

const useProvisioningActions = ({
	mutateOrder,
	order,
	resourceRequirements,
	selectedAccount,
}: UseProvisioningActionsProps) => {
	const {cloudConsoleURL} = useProperties();
	const {onClose, onOpenModal} = useModalContext();
	const [loading, setLoading] = useState(false);
	const [selectedProvisioningRow, setSelectedProvisioningRow] =
		useState<ProvisioningRow>();
	const installAlertModal = useModal();
	const navigate = useNavigate();
	const uninstallModal = useModal();

	const onClickInstall = (provisioningRow: ProvisioningRow) => {
		if (resourceRequirements.isLoading) {
			return;
		}

		setSelectedProvisioningRow(provisioningRow);

		if (!resourceRequirements.projectsUsage?.userProjects?.length) {
			return installAlertModal.onOpenChange(true);
		}

		navigate(
			`install/${order.id}?orderItemId=${provisioningRow.orderItemId}`
		);
	};

	const uninstall = async (provisioningRow: ProvisioningRow) => {
		setLoading(true);

		try {
			await Console.uninstallApp(
				{
					id: provisioningRow.id,
					orderItemId: provisioningRow.orderItemId,
				},
				order.id
			);

			await mutateOrder();

			Liferay.Util.openToast({
				message: i18n.translate('your-request-completed-successfully'),
				type: 'success',
			});
		}
		catch (error) {
			console.warn(error);

			Liferay.Util.openToast({
				message: i18n.translate('an-unexpected-error-occurred'),
				type: 'danger',
			});
		}

		setLoading(false);
	};

	const openUninstallModal = (provisioningRow: ProvisioningRow) => {
		setSelectedProvisioningRow(provisioningRow);

		uninstallModal.onOpenChange(true);
	};

	const onOpenDetailsModal = (provisioningRow: ProvisioningRow) => {
		const {inProgress, isInstalled, readyToInstall} =
			getProvisioningStatus(provisioningRow);

		onOpenModal({
			body: (
				<ProvisioningDetails
					account={selectedAccount}
					headerInfo={{
						image: order.placedOrderItems?.[0]?.thumbnail,
						licenseType: `${provisioningRow?.type} License for ${selectedAccount?.name}`,
						name: order.placedOrderItems?.[0]?.name,
					}}
					onClose={onClose}
					provisioningRow={provisioningRow}
				/>
			),
			center: true,
			footer: [
				undefined,
				undefined,
				<div key="details-footer-buttons">
					{readyToInstall && (
						<ClayButton
							className="border border-primary ml-2 rounded-lg text-primary"
							disabled={inProgress}
							displayType="secondary"
							onClick={() => {
								onClose();

								onClickInstall(provisioningRow);
							}}
							size="sm"
						>
							{i18n.translate('install')}
						</ClayButton>
					)}

					{isInstalled && (
						<ClayButton
							className="border border-danger ml-2 rounded-lg text-danger"
							displayType="secondary"
							onClick={() => {
								onClose();

								openUninstallModal(provisioningRow);
							}}
							size="sm"
						>
							{i18n.translate('uninstall')}
						</ClayButton>
					)}

					<ClayButton
						className="ml-2 rounded-lg"
						displayType="primary"
						onClick={onClose}
						size="sm"
					>
						{i18n.translate('done')}
					</ClayButton>
				</div>,
			],
			size: 'lg',
		});
	};

	const actions: ProvisioningAction[] = [
		{
			disabled: resourceRequirements.isLoading,
			label: 'install',
			onClick: (provisioningRow) => onClickInstall(provisioningRow),
			show: (provisioningRow) =>
				provisioningRow.status === InstallStatus.READY_TO_INSTALL,
		},
		{
			label: 'view-details',
			onClick: (provisioningRow) => onOpenDetailsModal(provisioningRow),
			show: () => true,
		},
		{
			label: 'go-to-cloud-console',
			onClick: (provisioningRow) =>
				window.open(
					`${cloudConsoleURL}/projects/${provisioningRow.projectId}/services`,
					'_blank',
					'noopener,noreferrer'
				),
			show: (provisioningRow) =>
				provisioningRow.status === InstallStatus.INSTALLED,
		},
		{
			label: 'uninstall',
			onClick: (provisioningRow) => openUninstallModal(provisioningRow),
			show: (provisioningRow) => {
				const {isInstalled} = getProvisioningStatus(provisioningRow);

				return isInstalled;
			},
		},
	];

	return {
		actions,
		installAlertModal,
		loading,
		onOpenDetailsModal,
		selectedProvisioningRow,
		uninstall,
		uninstallModal,
	};
};

export default useProvisioningActions;
