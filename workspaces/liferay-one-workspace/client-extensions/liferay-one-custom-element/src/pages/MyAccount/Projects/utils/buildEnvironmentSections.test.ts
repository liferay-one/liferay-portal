/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import buildEnvironmentSections from './buildEnvironmentSections';

import type {ProjectEnvironment} from '~/hooks/useProjectEnvironments';

const environment = {
	adminEmailAddress: 'admin@acme.com',
	adminFirstName: 'Jane',
	adminLastName: 'Doe',
	allowedEmailDomains: '@acme.com',
	disasterRecoveryRegion: 'London, England',
	friendlyURL: '/acme',
	id: '1',
	ownerEmailAddress: 'owner@acme.com',
	projectId: 'acme',
	region: 'Oregon, USA',
	timeZone: 'UTC',
	workspaceName: 'Acme Workspace',
} as ProjectEnvironment;

function getValues(profile: Parameters<typeof buildEnvironmentSections>[1]) {
	return buildEnvironmentSections([environment], profile).flatMap(({rows}) =>
		rows.map(({value}) => value)
	);
}

describe('[ROUTE-MY-ACCOUNT-PRODUCTERC] buildEnvironmentSections', () => {
	it('does not show the owner email of an analytics cloud workspace', () => {
		const values = getValues('analytics-cloud');

		expect(values).toContain('Acme Workspace');
		expect(values).not.toContain('owner@acme.com');
	});

	it('shows the owner email of a saas project and of a workspace', () => {
		expect(getValues('saas')).toContain('owner@acme.com');
		expect(getValues('workspace')).toContain('owner@acme.com');
	});
});
