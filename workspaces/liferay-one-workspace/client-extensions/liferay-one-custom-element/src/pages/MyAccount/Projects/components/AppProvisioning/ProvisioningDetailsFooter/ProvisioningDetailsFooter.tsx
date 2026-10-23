/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import useGetResourceInfo from '~/hooks/useGetResourceInfo';
import i18n from '~/i18n';

import {isInstallUnavailable} from '../provisioning';
import {InstallStatus} from '../types';

import type {ProvisioningRow} from '../hooks/useProvisioningData';

type ProvisioningDetailsFooterProps = {
	onClose: () => void;
	onInstall: (provisioningRow: ProvisioningRow) => void;
	onUninstall: (provisioningRow: ProvisioningRow) => void;
	provisioningRow: ProvisioningRow;
};

const ProvisioningDetailsFooter = ({
	onClose,
	onInstall,
	onUninstall,
	provisioningRow,
}: ProvisioningDetailsFooterProps) => {
	const resourceRequirements = useGetResourceInfo();

	return (
		<div>
			{provisioningRow.status === InstallStatus.READY_TO_INSTALL && (
				<ClayButton
					className="border border-primary ml-2 rounded-lg text-primary"
					disabled={isInstallUnavailable(resourceRequirements)}
					displayType="secondary"
					onClick={() => {
						onClose();

						onInstall(provisioningRow);
					}}
					size="sm"
				>
					{i18n.translate('install')}
				</ClayButton>
			)}

			{provisioningRow.status === InstallStatus.INSTALLED && (
				<ClayButton
					className="border border-danger ml-2 rounded-lg text-danger"
					displayType="secondary"
					onClick={() => {
						onClose();

						onUninstall(provisioningRow);
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
		</div>
	);
};

export default ProvisioningDetailsFooter;
