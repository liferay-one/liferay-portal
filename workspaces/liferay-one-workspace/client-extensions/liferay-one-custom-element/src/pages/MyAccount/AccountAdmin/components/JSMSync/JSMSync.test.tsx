/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import JSMSync from './JSMSync';

vi.mock(
	'~/pages/MyAccount/AccountAdmin/components/SyncToJSMButton/SyncToJSMButton',
	() => ({default: () => 'SyncToJSMButton'})
);

describe('[ROUTE-MY-ACCOUNT-ACCOUNT-ADMIN] JSMSync', () => {
	it('shows the JSM sync card with its description and the sync button', () => {
		render(<JSMSync />);

		expect(
			screen.getByRole('heading', {name: 'JSM Sync'})
		).toBeInTheDocument();
		expect(
			screen.getByText(
				'Sync to JSM sends this account, its projects, its users, and their roles to Jira Service Management now. Use it when JSM does not show a recent change.'
			)
		).toBeInTheDocument();
		expect(screen.getByText('SyncToJSMButton')).toBeInTheDocument();
	});
});
