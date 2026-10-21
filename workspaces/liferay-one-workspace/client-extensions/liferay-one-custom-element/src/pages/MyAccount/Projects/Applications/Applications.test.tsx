/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useProjectItems} from '~/hooks/useProjectItems';

import Applications from './Applications';

vi.mock('~/hooks/useProjectItems', () => ({
	useProjectItems: vi.fn(),
}));

describe('[ROUTE-MY-ACCOUNT-APPLICATIONS] Applications', () => {
	beforeEach(() => {
		vi.mocked(useProjectItems).mockReturnValue({
			applications: [
				{
					externalReferenceCode: 'APP-1',
					id: '101',
					name: 'Sample App',
					publisher: 'Acme Corp',
					saleType: 'free',
					specifications: [],
					startDate: 'Sep 5, 2026',
					status: 'completed',
					type: 'Application',
				},
			],
			error: undefined,
			loading: false,
			orderByProductExternalReferenceCode: new Map(),
			products: [],
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders application rows without icons or colored icon placeholders', () => {
		const {container} = render(
			<MemoryRouter>
				<Applications />
			</MemoryRouter>
		);

		const nameElement = screen.getByText('Sample App');
		expect(nameElement).toBeInTheDocument();
		expect(screen.getByText('Acme Corp')).toBeInTheDocument();

		const nameCell = nameElement.closest('td');
		expect(nameCell?.querySelector('.list-card-icon')).toBeNull();
		expect(nameCell?.querySelector('svg')).toBeNull();
		expect(container.querySelector('.list-card-icon')).toBeNull();
	});
});
