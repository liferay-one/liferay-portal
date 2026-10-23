/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import LicenseKeys from './LicenseKeys';

const mocks = vi.hoisted(() => ({
	handleNewKey: vi.fn(),
	useActivationKeyActions: vi.fn(),
	useActivationKeyScope: vi.fn(),
	useActivationKeySummary: vi.fn(),
	useHasAdminPermission: vi.fn(),
	useHasLicenseKeyPermission: vi.fn(),
	useProject: vi.fn(),
	useProjectActivationKeys: vi.fn(),
	useProjectEnvironments: vi.fn(),
}));

vi.mock('~/context/ProjectContext', () => ({
	useProject: () => mocks.useProject(),
}));

vi.mock('../hooks/useHasActivationPermission', () => ({
	useHasLicenseKeyPermission: () => mocks.useHasLicenseKeyPermission(),
}));

vi.mock('../hooks/useHasAdminPermission', () => ({
	useHasAdminPermission: () => mocks.useHasAdminPermission(),
}));

vi.mock('./hooks/useActivationKeyActions', () => ({
	default: () => mocks.useActivationKeyActions(),
}));

vi.mock('./hooks/useActivationKeyScope', () => ({
	useActivationKeyScope: () => mocks.useActivationKeyScope(),
}));

vi.mock('./hooks/useActivationKeySummary', () => ({
	useActivationKeySummary: () => mocks.useActivationKeySummary(),
}));

vi.mock('~/hooks/useProjectActivationKeys', () => ({
	useProjectActivationKeys: () => mocks.useProjectActivationKeys(),
}));

vi.mock('~/hooks/useProjectEnvironments', () => ({
	useProjectEnvironments: () => mocks.useProjectEnvironments(),
}));

function mockGeneratePermission(hasGeneratePermission: boolean) {
	mocks.useHasLicenseKeyPermission.mockReturnValue({
		hasActivationPermission: hasGeneratePermission,
		hasGeneratePermission,
		loading: false,
	});
}

function mockSummary({
	error,
	generatable,
	loading = false,
}: {
	error?: Error;
	generatable?: boolean;
	loading?: boolean;
}) {
	mocks.useActivationKeySummary.mockReturnValue({
		error,
		loading,
		summary: generatable === undefined ? undefined : {generatable},
	});
}

function renderLicenseKeys() {
	render(
		<MemoryRouter>
			<LicenseKeys />
		</MemoryRouter>
	);
}

describe('[ROUTE-MY-ACCOUNT-ACTIVATION] LicenseKeys', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mocks.useProject.mockReturnValue({projectId: 'PRJCT-001'});
		mocks.useHasAdminPermission.mockReturnValue(true);
		mocks.useActivationKeyScope.mockReturnValue({
			projectExternalReferenceCode: 'PRJCT-001',
		});
		mocks.useProjectActivationKeys.mockReturnValue({
			activationKeys: [],
			loading: false,
			revalidate: vi.fn(),
		});
		mocks.useProjectEnvironments.mockReturnValue({
			environments: [],
			loading: false,
		});
		mocks.useActivationKeyActions.mockReturnValue({
			handleDeactivate: vi.fn(),
			handleDownload: vi.fn(),
			handleNewKey: mocks.handleNewKey,
			handleReactivate: vi.fn(),
			handleRenew: vi.fn(),
		});
	});

	it('does not render the New Key button when the user lacks generate permission', () => {
		mockGeneratePermission(false);
		mockSummary({generatable: true});

		renderLicenseKeys();

		expect(
			screen.queryByRole('button', {name: /New Key/i})
		).not.toBeInTheDocument();
	});

	it('does not render the New Key button when the summary fails to load', () => {
		mockGeneratePermission(true);
		mockSummary({error: new Error('Unable to get summary')});

		renderLicenseKeys();

		expect(
			screen.queryByRole('button', {name: /New Key/i})
		).not.toBeInTheDocument();
	});

	it('renders the New Key button as disabled with a loading indicator while summary is loading', () => {
		mockGeneratePermission(true);
		mockSummary({loading: true});

		renderLicenseKeys();

		const button = screen.getByRole('button', {name: /New Key/i});

		expect(button).toBeDisabled();
		expect(button.querySelector('.loading-inline')).toBeInTheDocument();
		expect(
			button.closest('span[data-tooltip-align="top"]')
		).not.toHaveAttribute('title');
	});

	it('renders the New Key button as enabled when generatable is true', async () => {
		const user = userEvent.setup();

		mockGeneratePermission(true);
		mockSummary({generatable: true});

		renderLicenseKeys();

		const button = screen.getByRole('button', {name: /New Key/i});

		expect(button).toBeEnabled();

		await user.click(button);

		expect(mocks.handleNewKey).toHaveBeenCalledTimes(1);
	});

	it('renders the New Key button as disabled with a tooltip when generatable is false', () => {
		mockGeneratePermission(true);
		mockSummary({generatable: false});

		renderLicenseKeys();

		const button = screen.getByRole('button', {name: /New Key/i});

		expect(button).toBeDisabled();
		expect(
			button.closest('span[data-tooltip-align="top"]')
		).toHaveAttribute('title', 'No licenses available');
	});
});
