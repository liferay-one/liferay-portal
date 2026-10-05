/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useActivationKeyActions} from './useActivationKeyActions';

import type {ProjectActivationKey} from '~/hooks/useProjectActivationKeys';

const mocks = vi.hoisted(() => ({
	deactivateActivationKey: vi.fn(),
	downloadActivationKey: vi.fn(),
	downloadLicenseKey: vi.fn(),
	navigate: vi.fn(),
	openModal: vi.fn(),
	reactivateActivationKey: vi.fn(),
	updateLicenseKeyActive: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
	useNavigate: () => mocks.navigate,
}));

vi.mock('~/hooks/useConfirmationModal', () => ({
	useConfirmationModal: () => ({openModal: mocks.openModal}),
}));

vi.mock('~/services/spring-boot/ActivationKeys', () => ({
	default: {
		deactivateActivationKey: mocks.deactivateActivationKey,
		downloadActivationKey: mocks.downloadActivationKey,
		reactivateActivationKey: mocks.reactivateActivationKey,
	},
}));

vi.mock('~/services/spring-boot/LicenseKeys', () => ({
	default: {
		downloadLicenseKey: mocks.downloadLicenseKey,
		updateLicenseKeyActive: mocks.updateLicenseKeyActive,
	},
}));

const GENERATE_PATH = '/projects/PRJ-1/license-keys/generate';

const aggregatedRow = {
	activationKeyId: 'AK-1',
	id: 'KEY 1/a',
	licenseKeyId: 'LK-1',
	name: 'production-key',
	unaggregated: false,
} as ProjectActivationKey;

const unaggregatedRow = {
	activationKeyId: 'AK-2',
	id: 'KEY-2',
	licenseKeyId: 'LK-2',
	name: 'legacy-key',
	unaggregated: true,
} as ProjectActivationKey;

function renderActions() {
	const revalidate = vi.fn(() => Promise.resolve());

	const {result} = renderHook(() =>
		useActivationKeyActions({generatePath: GENERATE_PATH, revalidate})
	);

	return {actions: result.current, revalidate};
}

async function confirmModal() {
	const [[{onConfirm}]] = mocks.openModal.mock.calls;

	await onConfirm();
}

describe('[HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-USEACTIVATIONKEYACTIONS] useActivationKeyActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('deactivates an aggregated row through the activation key service after confirmation', async () => {
		const {actions, revalidate} = renderActions();

		actions.handleDeactivate(aggregatedRow);

		expect(mocks.openModal).toHaveBeenCalledWith(
			expect.objectContaining({status: 'danger'})
		);
		expect(mocks.deactivateActivationKey).not.toHaveBeenCalled();
		expect(revalidate).not.toHaveBeenCalled();

		await confirmModal();

		expect(mocks.deactivateActivationKey).toHaveBeenCalledWith('AK-1');
		expect(mocks.updateLicenseKeyActive).not.toHaveBeenCalled();
		expect(revalidate).toHaveBeenCalledTimes(1);
	});

	it('deactivates an unaggregated row through the license key service after confirmation', async () => {
		const {actions, revalidate} = renderActions();

		actions.handleDeactivate(unaggregatedRow);

		await confirmModal();

		expect(mocks.updateLicenseKeyActive).toHaveBeenCalledWith(
			false,
			'LK-2'
		);
		expect(mocks.deactivateActivationKey).not.toHaveBeenCalled();
		expect(revalidate).toHaveBeenCalledTimes(1);
	});

	it('downloads an aggregated row through the activation key service', async () => {
		const {actions} = renderActions();

		await actions.handleDownload(aggregatedRow);

		expect(mocks.downloadActivationKey).toHaveBeenCalledWith(
			'AK-1',
			'production-key.xml'
		);
		expect(mocks.downloadLicenseKey).not.toHaveBeenCalled();
	});

	it('downloads an unaggregated row through the license key service', async () => {
		const {actions} = renderActions();

		await actions.handleDownload(unaggregatedRow);

		expect(mocks.downloadLicenseKey).toHaveBeenCalledWith(
			'LK-2',
			'legacy-key.xml'
		);
		expect(mocks.downloadActivationKey).not.toHaveBeenCalled();
	});

	it('navigates to the generate path with the encoded new product', () => {
		const {actions} = renderActions();

		actions.handleNewKey(['PRDCT DXP&1', 'PRDCT-PORTAL']);

		expect(mocks.navigate).toHaveBeenCalledWith(
			`${GENERATE_PATH}?new=PRDCT%20DXP%261`
		);
	});

	it('navigates to the plain generate path without a new product', () => {
		const {actions} = renderActions();

		actions.handleNewKey();
		actions.handleNewKey([]);

		expect(mocks.navigate).toHaveBeenNthCalledWith(1, GENERATE_PATH);
		expect(mocks.navigate).toHaveBeenNthCalledWith(2, GENERATE_PATH);
	});

	it('reactivates an aggregated row through the activation key service after confirmation', async () => {
		const {actions, revalidate} = renderActions();

		actions.handleReactivate(aggregatedRow);

		expect(mocks.openModal).toHaveBeenCalledWith(
			expect.objectContaining({status: 'info'})
		);
		expect(mocks.reactivateActivationKey).not.toHaveBeenCalled();

		await confirmModal();

		expect(mocks.reactivateActivationKey).toHaveBeenCalledWith('AK-1');
		expect(mocks.updateLicenseKeyActive).not.toHaveBeenCalled();
		expect(revalidate).toHaveBeenCalledTimes(1);
	});

	it('reactivates an unaggregated row through the license key service after confirmation', async () => {
		const {actions, revalidate} = renderActions();

		actions.handleReactivate(unaggregatedRow);

		await confirmModal();

		expect(mocks.updateLicenseKeyActive).toHaveBeenCalledWith(true, 'LK-2');
		expect(mocks.reactivateActivationKey).not.toHaveBeenCalled();
		expect(revalidate).toHaveBeenCalledTimes(1);
	});

	it('navigates to the generate path with the encoded renew key', () => {
		const {actions} = renderActions();

		actions.handleRenew(aggregatedRow);

		expect(mocks.navigate).toHaveBeenCalledWith(
			`${GENERATE_PATH}?renew=KEY%201%2Fa`
		);
	});
});
