/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, useLocation} from 'react-router';
import {describe, expect, it} from 'vitest';

import ProjectDetailTabs, {DetailTab} from './ProjectDetailTabs';

const TABS: DetailTab[] = [
	{content: () => <p>Details Content</p>, key: 'details', label: 'details'},
	{content: () => <p>Orders Content</p>, key: 'orders', label: 'orders'},
];

function LocationSearch() {
	const {search} = useLocation();

	return <output data-testid="location-search">{search}</output>;
}

function renderProjectDetailTabs(initialEntry: string) {
	render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<ProjectDetailTabs tabs={TABS} />

			<LocationSearch />
		</MemoryRouter>
	);
}

describe('[ROUTE-MY-ACCOUNT-PRODUCTERC] ProjectDetailTabs', () => {
	it('opens the tab of the URL', () => {
		renderProjectDetailTabs('/product?tab=orders');

		expect(screen.getByText('Orders Content')).toBeInTheDocument();
		expect(screen.queryByText('Details Content')).toBeNull();
	});

	it('removes the search and filters of the list when the user changes the tab', async () => {
		const user = userEvent.setup();

		renderProjectDetailTabs('/product?tab=orders&search=dxp&status=active');

		await user.click(screen.getByRole('tab', {name: 'Details'}));

		expect(screen.getByText('Details Content')).toBeInTheDocument();
		expect(screen.getByTestId('location-search').textContent).toBe(
			'?tab=details'
		);
	});
});
