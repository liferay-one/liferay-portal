/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import ProvisioningDetailsFooter from './ProvisioningDetailsFooter';

import type {ProvisioningRow} from '../hooks/useProvisioningData';

const mocks = vi.hoisted(() => ({
	onClose: vi.fn(),
	onInstall: vi.fn(),
	onUninstall: vi.fn(),
	resourceInfo: {
		error: undefined as Error | undefined,
		isLoading: false,
		projectsUsage: undefined,
	},
}));

vi.mock('~/hooks/useGetResourceInfo', () => ({
	default: () => mocks.resourceInfo,
}));

function row(status: ProvisioningRow['status']): ProvisioningRow {
	return {
		environment: '',
		expirationDate: 'Jun 01, 2027',
		id: 'row-1',
		loading: undefined,
		orderItemId: 5,
		project: '',
		projectId: '',
		startDate: 'Jun 01, 2026',
		status,
		type: 'Subscription',
	};
}

function renderFooter(status: ProvisioningRow['status']) {
	render(
		<ProvisioningDetailsFooter
			onClose={mocks.onClose}
			onInstall={mocks.onInstall}
			onUninstall={mocks.onUninstall}
			provisioningRow={row(status)}
		/>
	);
}

describe('[COMPONENT-MYACCOUNT-PROJECTS-APPPROVISIONING-PROVISIONINGDETAILSFOOTER] ProvisioningDetailsFooter', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mocks.resourceInfo.error = undefined;
		mocks.resourceInfo.isLoading = false;
	});

	it('closes the modal and installs a ready row', async () => {
		renderFooter('ready-to-install');

		await userEvent.click(screen.getByRole('button', {name: 'Install'}));

		expect(mocks.onClose).toHaveBeenCalledTimes(1);
		expect(mocks.onInstall).toHaveBeenCalledWith(row('ready-to-install'));
	});

	it.each([
		['loading', {isLoading: true}],
		['failed', {error: new Error('boom')}],
	] as const)(
		'disables install while the cloud projects are %s',
		async (_, resourceInfo) => {
			Object.assign(mocks.resourceInfo, resourceInfo);

			renderFooter('ready-to-install');

			const install = screen.getByRole('button', {name: 'Install'});

			expect(install).toBeDisabled();

			await userEvent.click(install);

			expect(mocks.onClose).not.toHaveBeenCalled();
			expect(mocks.onInstall).not.toHaveBeenCalled();
		}
	);

	it('closes the modal and uninstalls an installed row', async () => {
		renderFooter('installed');

		expect(
			screen.queryByRole('button', {name: 'Install'})
		).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole('button', {name: 'Uninstall'}));

		expect(mocks.onClose).toHaveBeenCalledTimes(1);
		expect(mocks.onUninstall).toHaveBeenCalledWith(row('installed'));
	});

	it.each(['expired', 'in-progress'] as const)(
		'shows only done for a row that is %s',
		async (status) => {
			renderFooter(status);

			expect(
				screen
					.getAllByRole('button')
					.map((button) => button.textContent)
			).toEqual(['Done']);

			await userEvent.click(screen.getByRole('button', {name: 'Done'}));

			expect(mocks.onClose).toHaveBeenCalledTimes(1);
		}
	);
});
