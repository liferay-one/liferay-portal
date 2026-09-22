/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useNavigate} from 'react-router-dom';
import {useConfirmationModal} from '~/hooks/useConfirmationModal';
import {ProjectActivationKey} from '~/hooks/useProjectActivationKeys';
import {translate} from '~/i18n';
import LicenseKeysService from '~/services/spring-boot/LicenseKeys';

type UseLicenseKeyActionsProps = {
	generatePath: string;
	revalidate: () => void;
};

export function useLicenseKeyActions({
	generatePath,
	revalidate,
}: UseLicenseKeyActionsProps) {
	const navigate = useNavigate();
	const {openModal} = useConfirmationModal();

	function handleDeactivate(row: ProjectActivationKey) {
		openModal({
			body: translate('deactivate-activation-key-confirmation'),
			header: translate('deactivate-activation-key'),
			onConfirm: async () => {
				await LicenseKeysService.deactivateLicenseKey(row.licenseKeyId);

				await revalidate();
			},
			status: 'danger',
		});
	}

	async function handleDownload(row: ProjectActivationKey) {
		await LicenseKeysService.downloadLicenseKey(
			row.licenseKeyId,
			`${row.name}.xml`
		);
	}

	function handleReactivate(row: ProjectActivationKey) {
		openModal({
			body: translate('reactivate-activation-key-confirmation'),
			header: translate('reactivate-activation-key'),
			onConfirm: async () => {
				await LicenseKeysService.reactivateLicenseKey(row.licenseKeyId);

				await revalidate();
			},
			status: 'info',
		});
	}

	function handleNewKey(initialIncludedExternalReferenceCodes?: string[]) {
		const [externalReferenceCode] =
			initialIncludedExternalReferenceCodes ?? [];

		navigate(
			externalReferenceCode
				? `${generatePath}?new=${encodeURIComponent(
						externalReferenceCode
					)}`
				: generatePath
		);
	}

	function handleRenew(row: ProjectActivationKey) {
		navigate(`${generatePath}?renew=${encodeURIComponent(row.id)}`);
	}

	return {
		handleDeactivate,
		handleDownload,
		handleNewKey,
		handleReactivate,
		handleRenew,
	};
}

export default useLicenseKeyActions;
