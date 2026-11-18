/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useFetch} from '~/hooks/useFetch';

import ProjectLinkRedirect from './ProjectLinkRedirect';

vi.mock('~/components/EmptyState/EmptyState', () => ({
	default: ({title, type}: {title: string; type: string}) => (
		<div data-testid="empty-state">{`${type} ${title}`}</div>
	),
}));

vi.mock('~/components/Loading/Loading', () => ({
	default: {Page: () => <div data-testid="page-loading" />},
}));

vi.mock('~/hooks/useFetch', () => ({useFetch: vi.fn()}));

vi.mock('~/i18n', () => ({translate: (key: string) => key}));

function getPath(
	accountERC: string,
	projectERC: string,
	...segments: string[]
) {
	return ['', accountERC, 'project', projectERC, 'items', ...segments].join(
		'/'
	);
}

function mockProject(result: {data?: unknown; error?: unknown}) {
	vi.mocked(useFetch).mockReturnValue(result as ReturnType<typeof useFetch>);
}

function CurrentPath() {
	const {pathname, search} = useLocation();

	return <div data-testid="destination">{`${pathname}${search}`}</div>;
}

function renderAt(pathname: string) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Routes>
				<Route
					element={
						<ProjectLinkRedirect getPath={getPath} title="Items" />
					}
					path="/:projectERC/items/*"
				/>

				<Route
					element={<CurrentPath />}
					path="/:accountERC/project/*"
				/>
			</Routes>
		</MemoryRouter>
	);
}

describe('[ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS] ProjectLinkRedirect', () => {
	beforeEach(() => {
		vi.mocked(useFetch).mockReset();
	});

	it('reads the account of the project in the link', () => {
		mockProject({});

		renderAt('/PRJCT-1/items/42');

		expect(useFetch).toHaveBeenCalledWith(
			'/o/c/projects/by-external-reference-code/PRJCT-1?fields=r_accountEntryToProject_accountEntryERC'
		);
		expect(screen.getByTestId('page-loading')).toBeInTheDocument();
	});

	it('opens the same business event under the account of its project', () => {
		mockProject({
			data: {r_accountEntryToProject_accountEntryERC: 'ACCNT-1'},
		});

		renderAt('/PRJCT-1/items/42/edit?tab=1');

		expect(screen.getByTestId('destination')).toHaveTextContent(
			'/ACCNT-1/project/PRJCT-1/items/42/edit?tab=1'
		);
	});

	it('opens the business event list under the account of its project', () => {
		mockProject({
			data: {r_accountEntryToProject_accountEntryERC: 'ACCNT-1'},
		});

		renderAt('/PRJCT-1/items');

		expect(screen.getByTestId('destination')).toHaveTextContent(
			'/ACCNT-1/project/PRJCT-1/items'
		);
	});

	it('shows no access when the project does not load', () => {
		mockProject({error: new Error('Not Found')});

		renderAt('/PRJCT-MISSING/items/42');

		expect(screen.getByTestId('empty-state')).toHaveTextContent(
			'NO_ACCESS you-do-not-have-access-to-this-page'
		);
	});

	it('shows no access when the project has no account', () => {
		mockProject({data: {}});

		renderAt('/PRJCT-1/items/42');

		expect(screen.getByTestId('empty-state')).toBeInTheDocument();
	});
});
