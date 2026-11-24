/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import LicenseKeys from './LicenseKeys';

import type {ProjectActivationKey} from '~/hooks/useProjectActivationKeys';

const mocks = vi.hoisted(() => ({
	handleNewKey: vi.fn(),
	mutateDXPActivationCodes: vi.fn(),
	openModal: vi.fn(),
	patchDXPEnvironmentActive: vi.fn(),
	useActivationKeyActions: vi.fn(),
	useActivationKeyScope: vi.fn(),
	useActivationKeySummary: vi.fn(),
	useDXPActivationCodes: vi.fn(),
	useHasAdminPermission: vi.fn(),
	useHasLicenseKeyPermission: vi.fn(),
	useProject: vi.fn(),
	useProjectActivationKeys: vi.fn(),
	useProjectEnvironments: vi.fn(),
}));

vi.mock('~/hooks/useConfirmationModal', () => ({
	useConfirmationModal: () => ({openModal: mocks.openModal}),
}));

vi.mock('~/services/spring-boot/Projects', () => ({
	default: {
		patchDXPEnvironmentActive: mocks.patchDXPEnvironmentActive,
	},
}));

vi.mock('~/context/ProjectContext', () => ({
	useProject: () => mocks.useProject(),
}));

vi.mock('../hooks/useHasActivationPermission', () => ({
	useHasLicenseKeyPermission: () => mocks.useHasLicenseKeyPermission(),
}));

vi.mock('../hooks/useCanRenewVirtualCluster', () => ({
	useCanRenewVirtualCluster: () => false,
}));

vi.mock('../hooks/useHasAdminPermission', () => ({
	useHasAdminPermission: () => mocks.useHasAdminPermission(),
}));

vi.mock('./GenerateActivationKey/hooks/useDXPActivationCodes', () => ({
	default: () => mocks.useDXPActivationCodes(),
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

function getLocationSearch() {
	return new URLSearchParams(
		screen.getByTestId('location-search').textContent ?? ''
	);
}

function LocationDisplay() {
	const location = useLocation();

	return (
		<span data-testid="location">
			{location.pathname + location.search}
		</span>
	);
}

function LocationSearch() {
	const {search} = useLocation();

	return <output data-testid="location-search">{search}</output>;
}

function mockDXPActivationCodes(
	activationCodes: {
		activationStatus: string;
		installationId: string;
		lastHeartbeatAt?: string;
		productVersion?: string;
	}[]
) {
	mocks.useDXPActivationCodes.mockReturnValue({
		environmentTypes: [
			{
				activationCodes: activationCodes.map(
					(activationCode, index) => ({
						...activationCode,
						activationCode: `CODE-${index}`,
						activationMode: 'online',
						environmentId: `ENV-${index}`,
					})
				),
				availableCount: 0,
				endDate: '2027-12-31T00:00:00Z',
				maxClusterNodes: 2,
				startDate: '2027-01-01T00:00:00Z',
				totalCount: activationCodes.length,
				type: 'production',
				unlimited: false,
				usedCount: activationCodes.length,
			},
		],
		loading: false,
		mutate: mocks.mutateDXPActivationCodes,
	});
}

function toActivationKey(
	id: string,
	productName: string,
	status: ProjectActivationKey['status']
): ProjectActivationKey {
	return {
		activationKeyId: id,
		active: status === 'active',
		complimentary: false,
		description: '',
		expirationDate: '',
		expirationDateValue: '',
		id,
		licenseKeyFamily: '',
		name: `${productName} Environment`,
		productName,
		productVersion: '',
		startDate: '',
		startDateValue: '',
		status,
		type: 'production',
	};
}

function renderLicenseKeys(initialEntry = '/activation') {
	render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route
					element={
						<>
							<LicenseKeys />

							<LocationSearch />
						</>
					}
					path="/activation"
				/>

				<Route element={<LocationDisplay />} path="*" />
			</Routes>
		</MemoryRouter>
	);
}

Liferay.Util.SessionStorage = sessionStorage;

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
		mocks.useDXPActivationCodes.mockReturnValue({
			environmentTypes: [],
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

	it('renders the active DXP installations with their activation codes', () => {
		mockGeneratePermission(true);
		mockSummary({generatable: true});
		mockDXPActivationCodes([
			{activationStatus: 'active', installationId: 'INSTALLATION-ACTIVE'},
		]);

		renderLicenseKeys();

		const row = screen.getByText('INSTALLATION-ACTIVE').closest('tr');

		expect(
			within(row as HTMLElement).getByText('CODE-0')
		).toBeInTheDocument();
		expect(screen.getByText('Liferay DXP')).toBeInTheDocument();
		expect(screen.getByText('Online')).toBeInTheDocument();
		expect(
			screen.getByText('Jan 1, 2027 - Dec 31, 2027')
		).toBeInTheDocument();
		expect(screen.getAllByRole('row')).toHaveLength(2);
	});

	it('renders the DXP check-in to an admin', () => {
		mockGeneratePermission(true);
		mockSummary({generatable: true});
		mockDXPActivationCodes([
			{
				activationStatus: 'active',
				installationId: 'INSTALLATION-ACTIVE',
				lastHeartbeatAt: '2026-11-19T20:00:00Z',
				productVersion: '2027.Q1.0',
			},
		]);

		renderLicenseKeys();

		const row = screen.getByText('INSTALLATION-ACTIVE').closest('tr');

		expect(
			within(row as HTMLElement).getByText(
				/^2027\.Q1\.0 · Last check-in /
			)
		).toBeInTheDocument();
	});

	it('does not render the DXP check-in to a customer', () => {
		mocks.useHasAdminPermission.mockReturnValue(false);

		mockGeneratePermission(true);
		mockSummary({generatable: true});
		mockDXPActivationCodes([
			{
				activationStatus: 'active',
				installationId: 'INSTALLATION-ACTIVE',
				lastHeartbeatAt: '2026-11-19T20:00:00Z',
				productVersion: '2027.Q1.0',
			},
		]);

		renderLicenseKeys();

		expect(screen.queryByText(/2027\.Q1\.0/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Last check-in/)).not.toBeInTheDocument();
	});

	it('renders an unused DXP activation code as pending', () => {
		mockGeneratePermission(true);
		mockSummary({generatable: true});
		mockDXPActivationCodes([
			{activationStatus: 'pending', installationId: ''},
		]);

		renderLicenseKeys();

		const row = screen.getByText('CODE-0').closest('tr') as HTMLElement;

		expect(within(row).getByText('Not Activated')).toBeInTheDocument();
		expect(within(row).getByTitle('Pending')).toBeInTheDocument();
		expect(
			within(row).getByRole('button', {name: 'Copy Activation Code'})
		).toBeInTheDocument();
	});

	it('copies an unused DXP activation code', async () => {
		const user = userEvent.setup();

		const writeText = vi
			.spyOn(navigator.clipboard, 'writeText')
			.mockResolvedValue();

		mockGeneratePermission(true);
		mockSummary({generatable: true});
		mockDXPActivationCodes([
			{activationStatus: 'pending', installationId: ''},
		]);

		renderLicenseKeys();

		await user.click(
			screen.getByRole('button', {name: 'Copy Activation Code'})
		);

		expect(writeText).toHaveBeenCalledWith('CODE-0');
	});

	it('opens the offline activation of an unused DXP activation code', async () => {
		const user = userEvent.setup();

		mockGeneratePermission(true);
		mockSummary({generatable: true});
		mockDXPActivationCodes([
			{activationStatus: 'pending', installationId: ''},
		]);

		renderLicenseKeys();

		const row = screen.getByText('CODE-0').closest('tr') as HTMLElement;

		await user.click(
			within(row).getAllByRole('button').at(-1) as HTMLElement
		);
		await user.click(screen.getByText('Offline Activation'));

		expect(screen.getByTestId('location')).toHaveTextContent(
			'/activation/generate?dxpOffline=ENV-0'
		);
	});

	it('deactivates an unused DXP activation code', async () => {
		const user = userEvent.setup();

		mockGeneratePermission(true);
		mockSummary({generatable: true});
		mockDXPActivationCodes([
			{activationStatus: 'pending', installationId: ''},
		]);

		renderLicenseKeys();

		const row = screen.getByText('CODE-0').closest('tr') as HTMLElement;

		await user.click(
			within(row).getAllByRole('button').at(-1) as HTMLElement
		);
		await user.click(screen.getByText('Deactivate'));

		expect(mocks.openModal).toHaveBeenCalledWith(
			expect.objectContaining({header: 'Deactivate Activation Code'})
		);

		await mocks.openModal.mock.calls[0][0].onConfirm();

		expect(mocks.patchDXPEnvironmentActive).toHaveBeenCalledWith(
			'PRJCT-001',
			'ENV-0',
			false
		);
	});

	it('deactivates an active DXP installation', async () => {
		const user = userEvent.setup();

		mockGeneratePermission(true);
		mockSummary({generatable: true});
		mockDXPActivationCodes([
			{activationStatus: 'active', installationId: 'INSTALLATION-ACTIVE'},
		]);

		renderLicenseKeys();

		const row = screen.getByText('INSTALLATION-ACTIVE').closest('tr');

		await user.click(within(row as HTMLElement).getByRole('button'));
		await user.click(screen.getByText('Deactivate'));

		expect(mocks.openModal).toHaveBeenCalledTimes(1);

		await mocks.openModal.mock.calls[0][0].onConfirm();

		expect(mocks.patchDXPEnvironmentActive).toHaveBeenCalledWith(
			'PRJCT-001',
			'ENV-0',
			false
		);
		expect(mocks.mutateDXPActivationCodes).toHaveBeenCalledTimes(1);
	});

	it('renders a deactivated DXP installation as inactive without actions', () => {
		mockGeneratePermission(true);
		mockSummary({generatable: true});
		mockDXPActivationCodes([
			{
				activationStatus: 'inactive',
				installationId: 'INSTALLATION-INACTIVE',
			},
		]);

		renderLicenseKeys();

		const row = screen.getByText('INSTALLATION-INACTIVE').closest('tr');

		expect(
			within(row as HTMLElement).queryByRole('button')
		).not.toBeInTheDocument();
		expect(
			within(row as HTMLElement).getByTitle('Inactive')
		).toBeInTheDocument();
	});

	it('renders the filter button as an icon only', () => {
		mockGeneratePermission(true);
		mockSummary({generatable: true});

		renderLicenseKeys();

		expect(
			screen.getByRole('button', {name: 'Filter'})
		).toBeInTheDocument();
		expect(screen.queryByText('Filter')).toBeNull();
	});

	describe('filters in the URL', () => {
		beforeEach(() => {
			mockGeneratePermission(false);
			mockSummary({generatable: true});

			mocks.useProjectActivationKeys.mockReturnValue({
				activationKeys: [
					toActivationKey('KEY-DXP', 'DXP', 'active'),
					toActivationKey('KEY-PORTAL', 'Portal', 'expired'),
				],
				loading: false,
				revalidate: vi.fn(),
			});

			sessionStorage.clear();
		});

		it('applies the filters of the URL on the first render', () => {
			renderLicenseKeys('/activation?status=expired');

			expect(screen.getByText('Portal Environment')).toBeInTheDocument();
			expect(screen.queryByText('DXP Environment')).toBeNull();
			expect(screen.getByText('Status: Expired')).toBeInTheDocument();
		});

		it('applies the search of the URL on the first render', () => {
			renderLicenseKeys('/activation?search=dxp');

			expect(screen.getByPlaceholderText('Search')).toHaveValue('dxp');
			expect(screen.getByText('DXP Environment')).toBeInTheDocument();
			expect(screen.queryByText('Portal Environment')).toBeNull();
		});

		it('ignores a date filter of the URL that has no bound', () => {
			renderLicenseKeys('/activation?startDate=2026-01-01');

			expect(screen.getByText('DXP Environment')).toBeInTheDocument();
			expect(screen.getByText('Portal Environment')).toBeInTheDocument();
			expect(screen.queryByText(/^Start Date:/)).toBeNull();
		});

		it('keeps the text when the user types before the search of the URL', async () => {
			const user = userEvent.setup();

			renderLicenseKeys('/activation?search=dxp');

			await user.type(screen.getByPlaceholderText('Search'), 'my ', {
				initialSelectionEnd: 0,
				initialSelectionStart: 0,
			});

			expect(screen.getByPlaceholderText('Search')).toHaveValue('my dxp');
			expect(getLocationSearch().get('search')).toBe('my dxp');
		});

		it('writes the search to the URL and keeps the other parameters', async () => {
			const user = userEvent.setup();

			renderLicenseKeys('/activation?status=active');

			await user.type(screen.getByPlaceholderText('Search'), 'dxp');

			const searchParams = getLocationSearch();

			expect(searchParams.get('search')).toBe('dxp');
			expect(searchParams.get('status')).toBe('active');
		});

		it('removes a filter from the URL when the user removes its tag', async () => {
			const user = userEvent.setup();

			renderLicenseKeys('/activation?status=active&status=expired');

			const tag = screen.getByText('Status: Expired');

			await user.click(tag.querySelector('button') as HTMLButtonElement);

			expect(getLocationSearch().getAll('status')).toEqual(['active']);
			expect(screen.getByText('DXP Environment')).toBeInTheDocument();
			expect(screen.queryByText('Portal Environment')).toBeNull();
		});

		it('shows the label of a status filter while the keys load', () => {
			mocks.useProjectActivationKeys.mockReturnValue({
				activationKeys: [],
				loading: true,
				revalidate: vi.fn(),
			});

			renderLicenseKeys('/activation?status=expired');

			expect(screen.getByText('Status: Expired')).toBeInTheDocument();
		});

		it('restores the filters and the page size when the user returns to the activation page', () => {
			renderLicenseKeys('/activation?pageSize=20&status=expired');

			cleanup();

			renderLicenseKeys();

			const searchParams = getLocationSearch();

			expect(searchParams.get('pageSize')).toBe('20');
			expect(searchParams.getAll('status')).toEqual(['expired']);
			expect(screen.getByText('Status: Expired')).toBeInTheDocument();
			expect(screen.getByText('Portal Environment')).toBeInTheDocument();
			expect(screen.queryByText('DXP Environment')).toBeNull();
		});
	});
});
