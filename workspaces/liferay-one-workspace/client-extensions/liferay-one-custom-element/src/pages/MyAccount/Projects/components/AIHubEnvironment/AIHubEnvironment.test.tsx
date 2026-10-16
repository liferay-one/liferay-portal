/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import AIHubEnvironment from './AIHubEnvironment';

import type {ProjectEnvironment} from '~/hooks/useProjectEnvironments';

function toEnvironment(
	environment: Partial<ProjectEnvironment>
): ProjectEnvironment {
	return {
		adminEmailAddress: '',
		aiHubURL: '',
		name: '',
		ownerEmailAddress: '',
		tokenMonthlyAllowance: '',
		...environment,
	} as ProjectEnvironment;
}

describe('[ROUTE-MY-ACCOUNT-PRODUCTERC] AIHubEnvironment', () => {
	it('renders the AI Hub account name and administrator from the environment', () => {
		render(
			<AIHubEnvironment
				environment={toEnvironment({
					adminEmailAddress: 'ana.ribeiro@acme.com',
					name: 'Acme AI Hub',
					ownerEmailAddress: 'owner@acme.com',
				})}
			/>
		);

		expect(screen.getByText('Acme AI Hub')).toBeInTheDocument();
		expect(screen.getByText('ana.ribeiro@acme.com')).toBeInTheDocument();
		expect(screen.queryByText('owner@acme.com')).not.toBeInTheDocument();
	});

	it('omits the cells the environment leaves empty', () => {
		render(
			<AIHubEnvironment
				environment={toEnvironment({name: 'Acme AI Hub'})}
			/>
		);

		expect(screen.getByText('Acme AI Hub')).toBeInTheDocument();
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});
});
