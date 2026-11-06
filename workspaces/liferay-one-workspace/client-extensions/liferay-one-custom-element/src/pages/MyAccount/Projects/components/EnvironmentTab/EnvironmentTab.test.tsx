/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProject} from '~/context/ProjectContext';
import {useProperties} from '~/context/PropertiesContext';
import {useProjectEnvironments} from '~/hooks/useProjectEnvironments';

import EnvironmentTab from './EnvironmentTab';

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/context/PropertiesContext', () => ({useProperties: vi.fn()}));

vi.mock('~/hooks/useProjectEnvironments', () => ({
	useProjectEnvironments: vi.fn(),
}));

const ENVIRONMENT = {
	cloudProjectName: '',
	ldpDataSourceAccessToken: 'token-1',
	ldpWorkspacePath: '/acme',
	projectName: 'Alpha',
};

function mockEnvironments(environments: unknown[]) {
	vi.mocked(useProjectEnvironments).mockReturnValue({
		environments,
		loading: false,
	} as unknown as ReturnType<typeof useProjectEnvironments>);
}

describe('[ROUTE-MY-ACCOUNT-PRODUCTERC] EnvironmentTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useProject).mockReturnValue({
			projectId: 'PRJCT-A',
		} as unknown as ReturnType<typeof useProject>);

		vi.mocked(useProperties).mockReturnValue({
			analyticsCloudURL: 'https://ldp-stg.liferay.com',
		} as unknown as ReturnType<typeof useProperties>);
	});

	it('links to the LDP workspace before the environment exists', () => {
		mockEnvironments([]);

		render(
			<EnvironmentTab environment={ENVIRONMENT} profile="workspace" />
		);

		expect(screen.getByText('Workspace URL')).toBeInTheDocument();
		expect(screen.getByRole('link')).toHaveAttribute(
			'href',
			'https://ldp-stg.liferay.com/acme'
		);
	});

	it('links to the LDP workspace next to the environment details', () => {
		mockEnvironments([
			{
				id: 'ENV-1',
				offering: 'LDP',
				projectExternalReferenceCode: 'PRJCT-A',
				workspaceName: 'Acme Workspace',
			},
		]);

		render(
			<EnvironmentTab environment={ENVIRONMENT} profile="workspace" />
		);

		expect(screen.getByText('Acme Workspace')).toBeInTheDocument();
		expect(screen.getByRole('link')).toHaveAttribute(
			'href',
			'https://ldp-stg.liferay.com/acme'
		);
	});

	it('omits the workspace link until the workspace is provisioned', () => {
		mockEnvironments([]);

		render(
			<EnvironmentTab
				environment={{...ENVIRONMENT, ldpWorkspacePath: ''}}
				profile="workspace"
			/>
		);

		expect(screen.queryByText('Workspace URL')).not.toBeInTheDocument();
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});
});
