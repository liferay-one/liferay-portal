/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import routerPath from './routerPath';

const {getLayoutRelativeURL} = vi.hoisted(() => ({
	getLayoutRelativeURL: vi.fn(),
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		ThemeDisplay: {
			getLayoutRelativeURL,
			getPortalURL: () => 'https://portal.example.com',
		},
	},
}));

describe('[MOD-ROUTERPATH] routerPath', () => {
	beforeEach(() => {
		getLayoutRelativeURL.mockReset();
	});

	it('derives the site prefix from a layout under the site', () => {
		getLayoutRelativeURL.mockReturnValue(
			'/web/one/support/ticket-attachments'
		);

		expect(routerPath().ticketAttachments()).toBe(
			'https://portal.example.com/web/one/support/ticket-attachments'
		);
	});

	it('uses no site prefix when the layout is not under a site', () => {
		getLayoutRelativeURL.mockReturnValue('/support/ticket-attachments');

		expect(routerPath().ticketAttachments()).toBe(
			'https://portal.example.com/support/ticket-attachments'
		);
	});

	it('uses no site prefix for a root layout', () => {
		getLayoutRelativeURL.mockReturnValue('/home');

		expect(routerPath().ticketAttachments()).toBe(
			'https://portal.example.com/support/ticket-attachments'
		);
	});
});
