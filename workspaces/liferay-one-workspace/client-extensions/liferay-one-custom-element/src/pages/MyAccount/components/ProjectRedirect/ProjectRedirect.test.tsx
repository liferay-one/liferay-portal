/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useCurrentAccount} from '~/hooks/useAccounts';
import {
	resolveDefaultProject,
	useProjectsWithOrders,
} from '~/pages/MyAccount/Projects/projects';

import ProjectRedirect from './ProjectRedirect';

vi.mock('~/hooks/useAccounts', () => ({useCurrentAccount: vi.fn()}));

vi.mock('~/pages/MyAccount/Projects/projects', async (importOriginal) => ({
	...(await importOriginal<
		typeof import('~/pages/MyAccount/Projects/projects')
	>()),
	resolveDefaultProject: vi.fn(),
	useProjectsWithOrders: vi.fn(),
}));

const alpha = {externalReferenceCode: 'PRJCT-ALPHA', id: 1, name: 'Alpha'};
const beta = {externalReferenceCode: 'PRJCT-BETA', id: 2, name: 'Beta'};

function Location() {
	const {pathname, search} = useLocation();

	return <div data-testid="location">{`${pathname}${search}`}</div>;
}

function renderAt(pathname: string) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Routes>
				<Route element={<ProjectRedirect />} path="/project/*" />
				<Route element={<Location />} path="/:accountERC/*" />
			</Routes>
		</MemoryRouter>
	);
}

describe('[ROUTE-MY-ACCOUNT-PROJECT] ProjectRedirect', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useCurrentAccount).mockReturnValue({
			data: {externalReferenceCode: 'ACCNT-1'},
			isLoading: false,
		} as unknown as ReturnType<typeof useCurrentAccount>);
		vi.mocked(useProjectsWithOrders).mockReturnValue({
			loading: false,
			projects: [alpha, beta],
		} as unknown as ReturnType<typeof useProjectsWithOrders>);
		vi.mocked(resolveDefaultProject).mockReturnValue(alpha);
	});

	it.each([
		['/project', '/ACCNT-1/project/PRJCT-ALPHA'],
		['/project/products', '/ACCNT-1/project/PRJCT-ALPHA/products'],
		[
			'/project/products/PRDCT-1?tab=download',
			'/ACCNT-1/project/PRJCT-ALPHA/products/PRDCT-1?tab=download',
		],
		[
			'/project/contract/C_10/products',
			'/ACCNT-1/project/PRJCT-ALPHA/contract/C_10/products',
		],
		[
			'/project/PRJCT-BETA/contract/C_10/products/PRDCT-1',
			'/ACCNT-1/project/PRJCT-BETA/contract/C_10/products/PRDCT-1',
		],
		[
			'/project/PRJCT-UNKNOWN/applications',
			'/ACCNT-1/project/PRJCT-ALPHA/applications',
		],
	])('redirects %s to %s', (pathname, expected) => {
		renderAt(pathname);

		expect(screen.getByTestId('location').textContent).toBe(expected);
	});

	it.each([
		['/project', '/ACCNT-1/project/one-time-purchases'],
		[
			'/project/activation',
			'/ACCNT-1/project/one-time-purchases/activation',
		],
	])(
		'redirects %s to %s when the account has no project with orders',
		(pathname, expected) => {
			vi.mocked(useProjectsWithOrders).mockReturnValue({
				loading: false,
				projects: [],
			} as unknown as ReturnType<typeof useProjectsWithOrders>);
			vi.mocked(resolveDefaultProject).mockReturnValue(undefined);

			renderAt(pathname);

			expect(screen.getByTestId('location').textContent).toBe(expected);
		}
	);
});
