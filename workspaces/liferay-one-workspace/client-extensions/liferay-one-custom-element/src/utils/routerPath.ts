/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Liferay} from '~/services/liferay/liferay';
import {getSiteURL} from '~/utils/siteUtils';

export default function routerPath() {
	return {
		ticketAttachments: () =>
			`${Liferay.ThemeDisplay.getPortalURL()}${getSiteURL()}/support/ticket-attachments`,
	};
}
