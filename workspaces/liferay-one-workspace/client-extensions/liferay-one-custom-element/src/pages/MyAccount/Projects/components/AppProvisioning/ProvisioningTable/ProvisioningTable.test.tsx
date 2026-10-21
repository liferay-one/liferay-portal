/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import ProvisioningTable from './ProvisioningTable';

import type {PlacedOrder} from '~/types/orders';

import type {
	ProvisioningData,
	ProvisioningRow,
} from '../hooks/useProvisioningData';

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	onOpenModal: vi.fn(),
}));

vi.mock('react-router', () => ({
	useNavigate: () => mocks.navigate,
}));

vi.mock('~/context/PropertiesContext', () => ({
	useProperties: () => ({cloudConsoleURL: 'https://console.example.com'}),
}));

vi.mock('~/hooks/useModalContext', () => ({
	default: () => ({onClose: vi.fn(), onOpenModal: mocks.onOpenModal}),
}));

vi.mock('~/services/spring-boot/Console', () => ({
	default: {uninstallApp: vi.fn()},
}));

const order = {
	id: 77,
	placedOrderItems: [{name: 'App', thumbnail: 'thumb.png'}],
} as PlacedOrder;

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

function renderTable(
	status: ProvisioningRow['status'],
	{
		isLoading = false,
		userProjects = [{}],
	}: {
		isLoading?: boolean;
		userProjects?: unknown[];
	} = {}
) {
	render(
		<ProvisioningTable
			mutateOrder={vi.fn() as unknown as ProvisioningData['mutateOrder']}
			order={order}
			provisioningTableData={[row(status)]}
			resourceRequirements={
				{
					isLoading,
					projectsUsage: {userProjects},
				} as ProvisioningData['resourceRequirements']
			}
		/>
	);
}

async function openActionsMenu() {
	await userEvent.click(screen.getByRole('button', {name: 'Actions'}));
}

describe('[COMPONENT-MYACCOUNT-PROJECTS-APPPROVISIONING-PROVISIONINGTABLE] ProvisioningTable', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([
		'expired',
		'in-progress',
		'installed',
		'ready-to-install',
	] as const)(
		'shows a visible actions button on a row that is %s',
		(status) => {
			renderTable(status);

			expect(screen.getByRole('button', {name: 'Actions'})).toHaveClass(
				'text-neutral-7'
			);
		}
	);

	it.each([
		['expired', ['View Details']],
		['in-progress', ['View Details']],
		['installed', ['View Details', 'Go to Cloud Console', 'Uninstall']],
		['ready-to-install', ['Install', 'View Details']],
	] as const)(
		'lists the actions for a row that is %s',
		async (status, labels) => {
			renderTable(status);

			await openActionsMenu();

			expect(
				screen.getAllByRole('menuitem').map((item) => item.textContent)
			).toEqual(labels);
		}
	);

	it('starts the install flow when the user has a cloud project', async () => {
		renderTable('ready-to-install');

		await openActionsMenu();
		await userEvent.click(screen.getByRole('menuitem', {name: 'Install'}));

		expect(mocks.navigate).toHaveBeenCalledWith('install/77?orderItemId=5');
		expect(mocks.onOpenModal).not.toHaveBeenCalled();
	});

	it('does nothing on install while the cloud projects load', async () => {
		renderTable('ready-to-install', {isLoading: true});

		await openActionsMenu();
		await userEvent.click(screen.getByRole('menuitem', {name: 'Install'}));

		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(
			screen.queryByText('No Cloud Projects Available')
		).not.toBeInTheDocument();
	});

	it('shows the no cloud projects modal with visible buttons when the user has no cloud project', async () => {
		renderTable('ready-to-install', {userProjects: []});

		await openActionsMenu();
		await userEvent.click(screen.getByRole('menuitem', {name: 'Install'}));

		expect(
			await screen.findByText('No Cloud Projects Available')
		).toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'Cancel'})).toHaveClass(
			'btn-secondary'
		);
		expect(screen.getByRole('button', {name: 'Done'})).toHaveClass(
			'btn-primary'
		);
		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	it('opens the details modal from the actions menu', async () => {
		renderTable('ready-to-install');

		await openActionsMenu();
		await userEvent.click(
			screen.getByRole('menuitem', {name: 'View Details'})
		);

		expect(mocks.onOpenModal).toHaveBeenCalledTimes(1);
	});
});
