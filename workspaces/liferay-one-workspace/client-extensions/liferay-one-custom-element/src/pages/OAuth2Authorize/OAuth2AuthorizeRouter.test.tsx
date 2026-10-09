/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import useGetResourceInfo from '~/hooks/useGetResourceInfo';
import useRequireSignIn from '~/hooks/useRequireSignIn';

import OAuth2AuthorizeRouter from './OAuth2AuthorizeRouter';

vi.mock('~/hooks/useGetResourceInfo', () => ({default: vi.fn()}));
vi.mock('~/hooks/useRequireSignIn', () => ({default: vi.fn()}));
vi.mock('./AccountSelection/AccountSelection', () => ({
	default: () => 'AccountSelection page',
}));
vi.mock('./Congratulations/Congratulations', () => ({
	default: () => 'Congratulations page',
}));
vi.mock('./EnvironmentSelection/EnvironmentSelection', () => ({
	default: () => 'EnvironmentSelection page',
}));
vi.mock('./ProjectSelection/ProjectSelection', async () => {
	const {useOutletContext} = await import('react-router');

	return {
		default: function ProjectSelection() {
			const {code, isLoadingProjects, origin, projects, projectsError} =
				useOutletContext<{
					code: string;
					isLoadingProjects: boolean;
					origin: string;
					projects: {name: string}[];
					projectsError: boolean;
				}>();

			return `ProjectSelection page ${projects
				.map(({name}) => name)
				.join(
					','
				)} loading=${isLoadingProjects} error=${projectsError} code=${code} origin=${origin}`;
		},
	};
});

async function renderWithSearch(search: string) {
	window.history.replaceState(null, '', `/${search}#/project-selection`);

	vi.resetModules();

	const {default: freshUseGetResourceInfo} = await import(
		'~/hooks/useGetResourceInfo'
	);
	const {default: freshUseRequireSignIn} = await import(
		'~/hooks/useRequireSignIn'
	);

	vi.mocked(freshUseGetResourceInfo).mockReturnValue({
		error: undefined,
		isLoading: false,
		projectsUsage: {userProjects: []},
	} as unknown as ReturnType<typeof useGetResourceInfo>);
	vi.mocked(freshUseRequireSignIn).mockReturnValue(true);

	const {default: FreshOAuth2AuthorizeRouter} = await import(
		'./OAuth2AuthorizeRouter'
	);

	return render(<FreshOAuth2AuthorizeRouter />);
}

function renderAt(hash: string) {
	window.location.hash = hash;

	return render(<OAuth2AuthorizeRouter />);
}

describe('OAuth2AuthorizeRouter', () => {
	beforeEach(() => {
		vi.mocked(useRequireSignIn).mockReturnValue(true);
		vi.mocked(useGetResourceInfo).mockReturnValue({
			error: undefined,
			isLoading: false,
			projectsUsage: {userProjects: [{name: 'Alpha'}, {name: 'Beta'}]},
		} as unknown as ReturnType<typeof useGetResourceInfo>);
	});

	afterEach(() => {
		window.history.replaceState(null, '', '/');
	});

	it('renders AccountSelection at the index', () => {
		renderAt('#/');

		expect(screen.getByText('AccountSelection page')).toBeInTheDocument();
	});

	it.each([
		[
			'ROUTE-OAUTH2-AUTHORIZE-CONGRATULATIONS',
			'congratulations',
			'Congratulations page',
		],
		[
			'ROUTE-OAUTH2-AUTHORIZE-ENVIRONMENT-SELECTION',
			'environment-selection',
			'EnvironmentSelection page',
		],
	])('[%s] renders %s as %s', (_id, path, page) => {
		renderAt(`#/${path}`);

		expect(screen.getByText(page)).toBeInTheDocument();
	});

	it('[ROUTE-OAUTH2-AUTHORIZE-PROJECT-SELECTION] renders project-selection with the projects from the outlet context', () => {
		const path = 'project-selection';

		renderAt(`#/${path}`);

		expect(
			screen.getByText(
				'ProjectSelection page Alpha,Beta loading=false error=false code= origin='
			)
		).toBeInTheDocument();
	});

	it('redirects an unknown path to the index', () => {
		renderAt('#/unknown');

		expect(screen.getByText('AccountSelection page')).toBeInTheDocument();
	});

	it('renders nothing until the user is signed in', () => {
		vi.mocked(useRequireSignIn).mockReturnValue(false);

		const {container} = renderAt('#/congratulations');

		expect(container).toBeEmptyDOMElement();
	});

	it('passes the code and a bare state origin from the query string to the outlet context', async () => {
		await renderWithSearch(
			`?code=abc&state=${encodeURIComponent(
				JSON.stringify({origin: 'https://dxp.example.com'})
			)}`
		);

		expect(
			screen.getByText(/code=abc origin=https:\/\/dxp\.example\.com$/)
		).toBeInTheDocument();
	});

	it.each([
		[
			'a state origin with a path',
			encodeURIComponent(
				JSON.stringify({origin: 'https://dxp.example.com/path'})
			),
		],
		['a state that is not JSON', 'not-json'],
	])('drops the origin for %s', async (_label, state) => {
		await renderWithSearch(`?code=abc&state=${state}`);

		expect(screen.getByText(/code=abc origin=$/)).toBeInTheDocument();
	});
});
