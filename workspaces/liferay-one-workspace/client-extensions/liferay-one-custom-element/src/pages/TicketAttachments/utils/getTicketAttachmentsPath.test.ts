/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {getTicketAttachmentsPath} from './getTicketAttachmentsPath';

describe('[MOD-TICKETATTACHMENTS-GETTICKETATTACHMENTSPATH] getTicketAttachmentsPath', () => {
	it('builds the attachments path of a project in an account', () => {
		expect(getTicketAttachmentsPath('ACCNT-1', 'PRJCT-1')).toBe(
			'/ACCNT-1/project/PRJCT-1'
		);
	});
});
