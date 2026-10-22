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

describe('[ROUTE-MY-ACCOUNT-PROJECTS-ACTIVATION] LicenseKeys', () => {
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
		mocks.useHasLicenseKeyPermission.mockReturnValue({
			hasActivationPermission: false,
			hasGeneratePermission: false,
			loading: false,
		});
		mocks.useActivationKeySummary.mockReturnValue({
			error: undefined,
			loading: false,
			summary: {generatable: true},
		});

		render(
			<MemoryRouter>
				<LicenseKeys />
			</MemoryRouter>
		);

		expect(
			screen.queryByRole('button', {name: /New Key/i})
		).not.toBeInTheDocument();
	});

	it('renders the New Key button as disabled with a loading indicator while summary is loading', () => {
		mocks.useHasLicenseKeyPermission.mockReturnValue({
			hasActivationPermission: true,
			hasGeneratePermission: true,
			loading: false,
		});
		mocks.useActivationKeySummary.mockReturnValue({
			error: undefined,
			loading: true,
			summary: undefined,
		});

		render(
			<MemoryRouter>
				<LicenseKeys />
			</MemoryRouter>
		);

		const button = screen.getByRole('button', {name: /New Key/i});
		expect(button).toBeInTheDocument();
		expect(button).toBeDisabled();
		expect(button.querySelector('.loading-inline')).toBeInTheDocument();
	});

	it('renders the New Key button as enabled when generatable is true', async () => {
		const user = userEvent.setup();

		mocks.useHasLicenseKeyPermission.mockReturnValue({
			hasActivationPermission: true,
			hasGeneratePermission: true,
			loading: false,
		});
		mocks.useActivationKeySummary.mockReturnValue({
			error: undefined,
			loading: false,
			summary: {generatable: true},
		});

		render(
			<MemoryRouter>
				<LicenseKeys />
			</MemoryRouter>
		);

		const button = screen.getByRole('button', {name: /New Key/i});
		expect(button).toBeInTheDocument();
		expect(button).toBeEnabled();

		await user.click(button);

		expect(mocks.handleNewKey).toHaveBeenCalledTimes(1);
	});

	it('renders the New Key button as disabled with a tooltip when generatable is false', () => {
		mocks.useHasLicenseKeyPermission.mockReturnValue({
			hasActivationPermission: true,
			hasGeneratePermission: true,
			loading: false,
		});
		mocks.useActivationKeySummary.mockReturnValue({
			error: undefined,
			loading: false,
			summary: {generatable: false},
		});

		render(
			<MemoryRouter>
				<LicenseKeys />
			</MemoryRouter>
		);

		const button = screen.getByRole('button', {name: /New Key/i});
		expect(button).toBeInTheDocument();
		expect(button).toBeDisabled();

		const tooltipWrapper = button.closest('span[data-tooltip-align="top"]');
		expect(tooltipWrapper).toBeInTheDocument();
		expect(tooltipWrapper).toHaveAttribute(
			'title',
			'No licenses available'
		);
	});
});
