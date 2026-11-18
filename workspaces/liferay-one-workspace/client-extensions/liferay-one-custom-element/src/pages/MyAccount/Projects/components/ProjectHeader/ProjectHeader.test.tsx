/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {SelectorItem} from '~/components/EntitySelector/EntitySelector';
import {useProject} from '~/context/ProjectContext';
import {ProjectContract, useProjectCommerce} from '~/hooks/useProjectCommerce';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/projects';

import ProjectHeader from './ProjectHeader';

vi.mock('~/components/EntitySelector/EntitySelector', () => ({
	default: ({
		items,
		name,
		subtitle,
	}: {
		items: SelectorItem[];
		name: string;
		subtitle?: string;
	}) => (
		<>
			<div data-testid="trigger">
				{name}|{subtitle ?? ''}
			</div>

			<ul>
				{items.map((item) => (
					<li key={item.id}>
						{item.name}|{item.subtitle ?? ''}
					</li>
				))}
			</ul>
		</>
	),
}));

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/hooks/useProjectCommerce', () => ({useProjectCommerce: vi.fn()}));

const namedContract: ProjectContract = {
	endDate: '2027-01-31T00:00:00Z',
	externalReferenceCode: '800Ux00000AbCdEIAV',
	name: 'Enterprise Renewal',
	startDate: '2026-02-01T00:00:00Z',
};

const undatedContract: ProjectContract = {
	externalReferenceCode: '800Ux00000QrStUIAV',
};

const unnamedContract: ProjectContract = {
	endDate: '2026-01-31T00:00:00Z',
	externalReferenceCode: '800Ux00000ZyXwVIAV',
	startDate: '2025-02-01T00:00:00Z',
};

function mockContracts(
	contracts: ProjectContract[],
	resolvedContractERC: string
) {
	const project: Partial<ReturnType<typeof useProject>> = {
		projectId: 'PRJCT-1',
		setSelectedContractERC: vi.fn(),
	};

	const projectCommerce: Partial<ReturnType<typeof useProjectCommerce>> = {
		contracts,
		loading: false,
		resolvedContractERC,
	};

	vi.mocked(useProject).mockReturnValue(
		project as ReturnType<typeof useProject>
	);

	vi.mocked(useProjectCommerce).mockReturnValue(
		projectCommerce as ReturnType<typeof useProjectCommerce>
	);
}

describe('[ROUTE-MY-ACCOUNT-CONTRACT-CONTRACTERC] ProjectHeader', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows the contract dates with the contract name under them', () => {
		mockContracts(
			[namedContract, unnamedContract],
			namedContract.externalReferenceCode
		);

		render(<ProjectHeader />);

		expect(screen.getByTestId('trigger').textContent).toBe(
			'02.01.2026 - 01.31.2027|Enterprise Renewal'
		);
		expect(
			screen.getByText('02.01.2026 - 01.31.2027|Enterprise Renewal', {
				selector: 'li',
			})
		).toBeTruthy();
	});

	it('shows only the contract dates when the contract has no name', () => {
		mockContracts([unnamedContract], unnamedContract.externalReferenceCode);

		render(<ProjectHeader />);

		expect(screen.getByTestId('trigger').textContent).toBe(
			'02.01.2025 - 01.31.2026|'
		);
	});

	it('shows a dash when the contract has no dates', () => {
		mockContracts([undatedContract], undatedContract.externalReferenceCode);

		const {container} = render(<ProjectHeader />);

		expect(screen.getByTestId('trigger').textContent).toBe('-|');
		expect(container.textContent).not.toContain(
			undatedContract.externalReferenceCode
		);
	});

	it('never shows the Salesforce contract ID', () => {
		mockContracts(
			[namedContract, unnamedContract],
			unnamedContract.externalReferenceCode
		);

		const {container} = render(<ProjectHeader />);

		expect(container.textContent).not.toContain(
			namedContract.externalReferenceCode
		);
		expect(container.textContent).not.toContain(
			unnamedContract.externalReferenceCode
		);
	});

	it('shows one time purchases by name with no linked contract', () => {
		mockContracts(
			[
				{
					externalReferenceCode: ONE_TIME_PURCHASES,
					name: 'One Time Purchases',
				},
			],
			ONE_TIME_PURCHASES
		);

		render(<ProjectHeader />);

		expect(screen.getByTestId('trigger').textContent).toBe(
			'One Time Purchases|No Contract Linked'
		);
	});
});
