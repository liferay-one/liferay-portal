/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import LicensingSettings from './LicensingSettings';

const mocks = vi.hoisted(() => ({
	canManageAccountAdmin: true,
	mutate: vi.fn(),
	openToast: vi.fn(),
	patchLicensingSettings: vi.fn(),
	useProjectLicensingSettings: vi.fn(),
}));

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: () => ({
		userAccountModel: {
			canManageAccountAdmin: mocks.canManageAccountAdmin,
		},
	}),
}));

vi.mock(
	'~/pages/MyAccount/AccountAdmin/hooks/useProjectLicensingSettings',
	() => ({default: mocks.useProjectLicensingSettings})
);

vi.mock('~/services/spring-boot/Projects', () => ({
	default: {patchLicensingSettings: mocks.patchLicensingSettings},
}));

describe('[ROUTE-MY-ACCOUNT-ACCOUNT-ADMIN] LicensingSettings', () => {
	beforeEach(() => {
		mocks.canManageAccountAdmin = true;

		mocks.useProjectLicensingSettings.mockReturnValue({
			data: {
				items: [
					{
						allowComplimentary: true,
						allowPermanentLicenses: false,
						allowSelfProvisioning: true,
						externalReferenceCode: 'PRJCT-1',
						id: 1,
						name: 'Alpha',
					},
				],
				totalCount: 1,
			},
			error: undefined,
			isLoading: false,
			mutate: mocks.mutate,
		});

		vi.spyOn(Liferay.Util, 'openToast').mockImplementation(mocks.openToast);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('shows each setting of each project', () => {
		render(<LicensingSettings />);

		expect(
			screen.getByRole('switch', {name: 'Complimentary Key Alpha'})
		).toBeChecked();
		expect(
			screen.getByRole('switch', {name: 'Permanent Licenses Alpha'})
		).not.toBeChecked();
		expect(
			screen.getByRole('switch', {name: 'Self Provisioning Alpha'})
		).toBeChecked();
	});

	it('shows the default of each setting that a project has no value for', () => {
		mocks.useProjectLicensingSettings.mockReturnValue({
			data: {
				items: [
					{
						allowComplimentary: null,
						allowPermanentLicenses: null,
						allowSelfProvisioning: null,
						externalReferenceCode: 'PRJCT-1',
						id: 1,
						name: 'Alpha',
					},
				],
				totalCount: 1,
			},
			error: undefined,
			isLoading: false,
			mutate: mocks.mutate,
		});

		render(<LicensingSettings />);

		expect(
			screen.getByRole('switch', {name: 'Complimentary Key Alpha'})
		).not.toBeChecked();
		expect(
			screen.getByRole('switch', {name: 'Permanent Licenses Alpha'})
		).not.toBeChecked();
		expect(
			screen.getByRole('switch', {name: 'Self Provisioning Alpha'})
		).toBeChecked();
	});

	it('shows the settings with every toggle turned off to a user who cannot manage them', () => {
		mocks.canManageAccountAdmin = false;

		render(<LicensingSettings />);

		for (const name of [
			'Complimentary Key Alpha',
			'Permanent Licenses Alpha',
			'Self Provisioning Alpha',
		]) {
			expect(screen.getByRole('switch', {name})).toBeDisabled();
		}
	});

	it('saves only the setting that changed and updates that project without a reload', async () => {
		mocks.patchLicensingSettings.mockResolvedValue({
			allowComplimentary: true,
			allowPermanentLicenses: true,
			allowSelfProvisioning: true,
			externalReferenceCode: 'PRJCT-1',
		});

		render(<LicensingSettings />);

		fireEvent.click(
			screen.getByRole('switch', {name: 'Permanent Licenses Alpha'})
		);

		await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());

		expect(mocks.patchLicensingSettings).toHaveBeenCalledWith('PRJCT-1', {
			allowPermanentLicenses: true,
		});

		const [update, options] = mocks.mutate.mock.calls[0];

		expect(options).toEqual({revalidate: false});
		expect(
			update({
				items: [
					{
						allowPermanentLicenses: false,
						externalReferenceCode: 'PRJCT-1',
						name: 'Alpha',
					},
					{
						allowPermanentLicenses: false,
						externalReferenceCode: 'PRJCT-2',
						name: 'Beta',
					},
				],
				totalCount: 2,
			}).items.map(
				({allowPermanentLicenses}: {allowPermanentLicenses: boolean}) =>
					allowPermanentLicenses
			)
		).toEqual([true, false]);
		expect(mocks.openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'success'})
		);
	});

	it('reports a failed save and reloads the stored settings', async () => {
		mocks.patchLicensingSettings.mockRejectedValue({
			info: {title: 'Forbidden'},
		});

		render(<LicensingSettings />);

		fireEvent.click(
			screen.getByRole('switch', {name: 'Self Provisioning Alpha'})
		);

		await waitFor(() =>
			expect(mocks.openToast).toHaveBeenCalledWith({
				message: 'Forbidden',
				type: 'danger',
			})
		);

		await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());

		expect(mocks.openToast).not.toHaveBeenCalledWith(
			expect.objectContaining({type: 'success'})
		);
	});
});
