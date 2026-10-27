/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayForm, {ClayInput} from '@clayui/form';
import {useState} from 'react';
import Modal from '~/components/Modal/Modal';
import i18n from '~/i18n';

import activateEnvironment from '../../utils/activateEnvironment';

import type {Observer} from '@clayui/modal/lib/types';
import type {InspectedEntry} from '~/types/accountInspection';

type ActivateEnvironmentModalProps = {
	entry: InspectedEntry;
	observer: Observer;
	onActivated: () => void;
	onClose: () => void;
	visible: boolean;
};

export default function ActivateEnvironmentModal({
	entry,
	observer,
	onActivated,
	onClose,
	visible,
}: ActivateEnvironmentModalProps) {
	const [hostName, setHostName] = useState(
		(entry.hostName as string | undefined) ?? ''
	);
	const [saving, setSaving] = useState(false);

	const handleSubmit = async () => {
		setSaving(true);

		const activated = await activateEnvironment(entry, hostName.trim());

		setSaving(false);

		if (activated) {
			onClose();
			onActivated();
		}
	};

	return (
		<Modal
			last={
				<ClayButton.Group spaced>
					<ClayButton
						disabled={saving}
						displayType="secondary"
						onClick={onClose}
					>
						{i18n.translate('cancel')}
					</ClayButton>

					<ClayButton disabled={saving} onClick={handleSubmit}>
						{i18n.translate('set-to-active')}
					</ClayButton>
				</ClayButton.Group>
			}
			observer={observer}
			subtitle={i18n.translate(
				'set-this-environment-to-active-after-its-workspace-is-provisioned'
			)}
			title={i18n.sub('set-x-to-active', String(entry.offering))}
			visible={visible}
		>
			{entry.offering === 'SaaS' && (
				<ClayForm.Group>
					<label htmlFor="activateEnvironmentHostName">
						{i18n.translate('host-name')}
					</label>

					<ClayInput
						id="activateEnvironmentHostName"
						onChange={(event) => setHostName(event.target.value)}
						placeholder="example.liferay.net"
						value={hostName}
					/>

					<ClayForm.Text>
						{i18n.translate(
							'the-customer-uses-the-host-name-to-open-their-liferay-saas-workspace'
						)}
					</ClayForm.Text>
				</ClayForm.Group>
			)}
		</Modal>
	);
}
