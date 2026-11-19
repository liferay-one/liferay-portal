/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import i18n from '~/i18n';
import SyncToJSMButton from '~/pages/MyAccount/AccountAdmin/components/SyncToJSMButton/SyncToJSMButton';

export default function JSMSync() {
	return (
		<DetailedCard
			cardIconAltText={i18n.translate('jsm-sync')}
			cardTitle={i18n.translate('jsm-sync')}
			className="mt-4"
			clayIcon="reload"
			headerActions={<SyncToJSMButton />}
		>
			<p className="mb-0 mt-3 text-secondary">
				{i18n.translate('jsm-sync-description')}
			</p>
		</DetailedCard>
	);
}
