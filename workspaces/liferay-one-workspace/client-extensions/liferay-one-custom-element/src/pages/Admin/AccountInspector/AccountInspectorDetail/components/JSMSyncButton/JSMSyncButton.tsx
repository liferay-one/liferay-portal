/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayButtonWithIcon} from '@clayui/button';
import {useState} from 'react';
import i18n from '~/i18n';

import syncRecordToJSM from '../../utils/syncRecordToJSM';

import type {JSMRecord} from '~/types/accountInspection';

type JSMSyncButtonProps = {
	onSynced: () => void;
	record: JSMRecord;
};

export default function JSMSyncButton({onSynced, record}: JSMSyncButtonProps) {
	const [syncing, setSyncing] = useState(false);

	const label = i18n.translate(syncing ? 'syncing-to-jsm' : 'sync-to-jsm');

	const handleClick = async () => {
		setSyncing(true);

		if (await syncRecordToJSM(record)) {
			onSynced();
		}

		setSyncing(false);
	};

	return (
		<ClayButtonWithIcon
			aria-label={label}
			borderless
			disabled={syncing || !record.externalReferenceCode}
			displayType="secondary"
			onClick={handleClick}
			size="sm"
			symbol="reload"
			title={label}
		/>
	);
}
