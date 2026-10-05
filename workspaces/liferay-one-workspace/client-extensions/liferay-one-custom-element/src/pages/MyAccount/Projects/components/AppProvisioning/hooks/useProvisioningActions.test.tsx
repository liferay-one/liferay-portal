/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import useProvisioningActions from './useProvisioningActions';

import type {PlacedOrder} from '~/types/orders';

import type {ProvisioningData, ProvisioningRow} from './useProvisioningData';

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	onClose: vi.fn(),
	onOpenModal: vi.fn(),
	openToast: vi.fn(),
	uninstallApp: vi.fn(),
	windowOpen: vi.fn(),
}));

vi.mock('@clayui/modal', async (importOriginal) => ({
	...(await importOriginal<typeof import('@clayui/modal')>()),
	useModal: () => ({observer: {}, onOpenChange: vi.fn(), open: false}),
}));

vi.mock('react-router-dom', () => ({
	useNavigate: () => mocks.navigate,
}));

vi.mock('~/context/PropertiesContext', () => ({
	useProperties: () => ({cloudConsoleURL: 'https://console.example.com'}),
}));

vi.mock('~/hooks/useModalContext', () => ({
	default: () => ({onClose: mocks.onClose, onOpenModal: mocks.onOpenModal}),
}));

vi.mock('~/services/spring-boot/Console', () => ({
	default: {uninstallApp: mocks.uninstallApp},
}));

vi.mock('../ProvisioningDetails/ProvisioningDetails', () => ({
	default: () => null,
}));

const order = {
	id: 77,
	placedOrderItems: [{name: 'App', thumbnail: 'thumb.png'}],
} as PlacedOrder;

function row(status: ProvisioningRow['status']): ProvisioningRow {
	return {
		environment: 'PRD',
		expirationDate: 'Jun 01, 2027',
		id: 'dep-1',
		loading: undefined,
		orderItemId: 5,
		project: 'ACME',
		projectId: 'acme-prd',
		startDate: 'Jun 01, 2026',
		status,
		type: 'Subscription',
	};
}

function renderActions({
	isLoading = false,
	userProjects = [{}],
}: {
	isLoading?: boolean;
	userProjects?: unknown[];
} = {}) {
	const mutateOrder = vi.fn(() => Promise.resolve());

	const resourceRequirements = {
		error: undefined,
		isLoading,
		projectsUsage: {userProjects},
	} as ProvisioningData['resourceRequirements'];

	const hook = renderHook(() =>
		useProvisioningActions({
			mutateOrder: mutateOrder as ProvisioningData['mutateOrder'],
			order,
			resourceRequirements,
		})
	);

	return {...hook, mutateOrder};
}

function findAction(
	actions: ReturnType<typeof useProvisioningActions>['actions'],
	title: string
) {
	const action = actions.find((current) => current.title === title);

	if (!action) {
		throw new Error(`Missing action ${title}`);
	}

	return action;
}

describe('[HOOK-MYACCOUNT-PROJECTS-APPPROVISIONING-USEPROVISIONINGACTIONS] useProvisioningActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(Liferay.Util, 'openToast').mockImplementation(mocks.openToast);
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(window, 'open').mockImplementation(mocks.windowOpen);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('ignores install while resource requirements load', () => {
		const {result} = renderActions({isLoading: true});

		act(() => {
			findAction(result.current.actions, 'Install').action(
				row('ready-to-install')
			);
		});

		expect(mocks.navigate).not.toHaveBeenCalled();
		expect(
			result.current.installAlertModal.onOpenChange
		).not.toHaveBeenCalled();
		expect(result.current.selectedProvisioningRow).toBeUndefined();
	});

	it('navigates to the install route with the order item ID when the user has projects', () => {
		const {result} = renderActions();

		act(() => {
			findAction(result.current.actions, 'Install').action(
				row('ready-to-install')
			);
		});

		expect(mocks.navigate).toHaveBeenCalledWith('install/77?orderItemId=5');
		expect(result.current.selectedProvisioningRow?.orderItemId).toBe(5);
	});

	it('opens the cloud console for the project of the row', () => {
		const {result} = renderActions();

		findAction(result.current.actions, 'Go to Cloud Console').action(
			row('installed')
		);

		expect(mocks.windowOpen).toHaveBeenCalledWith(
			'https://console.example.com/projects/acme-prd/services',
			'_blank',
			'noopener,noreferrer'
		);
	});

	it('opens the alert modal instead of navigating when the user has no projects', () => {
		const {result} = renderActions({userProjects: []});

		const {installAlertModal} = result.current;

		act(() => {
			findAction(result.current.actions, 'Install').action(
				row('ready-to-install')
			);
		});

		expect(installAlertModal.onOpenChange).toHaveBeenCalledWith(true);
		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	it('opens the details modal for any row', () => {
		const {result} = renderActions();

		findAction(result.current.actions, 'View Details').action(
			row('installed')
		);

		expect(mocks.onOpenModal).toHaveBeenCalledWith(
			expect.objectContaining({center: true, size: 'lg'})
		);
	});

	it('opens the uninstall modal for the selected row', () => {
		const {result} = renderActions();

		const {uninstallModal} = result.current;

		act(() => {
			findAction(result.current.actions, 'Uninstall').action(
				row('installed')
			);
		});

		expect(uninstallModal.onOpenChange).toHaveBeenCalledWith(true);
		expect(result.current.selectedProvisioningRow?.status).toBe(
			'installed'
		);
	});

	it('shows install only for ready rows and uninstall and console only for installed rows', () => {
		const {result} = renderActions();

		const visibleTitles = (status: ProvisioningRow['status']) =>
			result.current.actions
				.filter((action) => action.show(row(status)))
				.map(({title}) => title);

		expect(visibleTitles('ready-to-install')).toEqual([
			'Install',
			'View Details',
		]);
		expect(visibleTitles('installed')).toEqual([
			'View Details',
			'Go to Cloud Console',
			'Uninstall',
		]);
		expect(visibleTitles('in-progress')).toEqual(['View Details']);
		expect(visibleTitles('expired')).toEqual(['View Details']);
	});

	it('toasts danger and clears loading when uninstall fails', async () => {
		mocks.uninstallApp.mockRejectedValue(new Error('boom'));

		const {mutateOrder, result} = renderActions();

		await act(async () => {
			await result.current.uninstall(row('installed'));
		});

		expect(mutateOrder).not.toHaveBeenCalled();
		expect(mocks.openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'danger'})
		);
		expect(result.current.loading).toBe(false);
	});

	it('uninstalls, revalidates the order, toasts success and clears loading', async () => {
		let resolveUninstall: () => void = () => {};

		mocks.uninstallApp.mockReturnValue(
			new Promise<void>((resolve) => {
				resolveUninstall = resolve;
			})
		);

		const {mutateOrder, result} = renderActions();

		let uninstallPromise: Promise<void> = Promise.resolve();

		act(() => {
			uninstallPromise = result.current.uninstall(row('installed'));
		});

		expect(result.current.loading).toBe(true);
		expect(mocks.uninstallApp).toHaveBeenCalledWith(
			{id: 'dep-1', orderItemId: 5},
			77
		);

		await act(async () => {
			resolveUninstall();

			await uninstallPromise;
		});

		expect(mutateOrder).toHaveBeenCalledTimes(1);
		expect(mocks.openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'success'})
		);
		expect(result.current.loading).toBe(false);
	});
});
