/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useModal} from '@clayui/modal';
import {useRef, useState} from 'react';
import {useNavigate} from 'react-router';
import {useProperties} from '~/context/PropertiesContext';
import useModalContext from '~/hooks/useModalContext';
import i18n, {Word} from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import Console from '~/services/spring-boot/Console';

import ProvisioningDetails from '../ProvisioningDetails/ProvisioningDetails';
import ProvisioningDetailsFooter from '../ProvisioningDetailsFooter/ProvisioningDetailsFooter';
import {isInstallUnavailable} from '../provisioning';
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
	const resourceRequirementsRef = useRef(resourceRequirements);
	const uninstallModal = useModal();

	resourceRequirementsRef.current = resourceRequirements;

	const onClickInstall = (provisioningRow: ProvisioningRow) => {
		const {current} = resourceRequirementsRef;

		if (isInstallUnavailable(current)) {
			return;
		}

		setSelectedProvisioningRow(provisioningRow);

		if (!current.projectsUsage?.userProjects?.length) {
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
				<ProvisioningDetailsFooter
					key="details-footer-buttons"
					onClose={onClose}
					onInstall={onClickInstall}
					onUninstall={openUninstallModal}
					provisioningRow={provisioningRow}
				/>,
			],
			size: 'lg',
		});
	};

	const actions: ProvisioningAction[] = [
		{
			disabled: isInstallUnavailable(resourceRequirements),
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
			show: (provisioningRow) =>
				provisioningRow.status === InstallStatus.INSTALLED,
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
