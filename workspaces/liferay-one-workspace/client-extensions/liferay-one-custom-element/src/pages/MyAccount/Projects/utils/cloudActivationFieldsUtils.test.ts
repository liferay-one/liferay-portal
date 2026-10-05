/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	getCloudActivationAdminFields,
	getCloudActivationFields,
	getCloudConsoleURL,
} from './cloudActivationFieldsUtils';

import type {ProjectEnvironment} from '~/hooks/useProjectEnvironments';

function toEnvironment(environment: Partial<ProjectEnvironment>) {
	return environment as ProjectEnvironment;
}

function toRequiredByField(profile: 'analytics-cloud' | 'paas' | 'saas') {
	return Object.fromEntries(
		getCloudActivationFields(profile).map(
			({environmentField, required}) => [environmentField, required]
		)
	);
}

describe('[MOD-MYACCOUNT-PROJECTS-CLOUDACTIVATIONFIELDSUTILS] cloudActivationFieldsUtils', () => {
	it('returns the analytics cloud fields with their required flags', () => {
		expect(toRequiredByField('analytics-cloud')).toEqual({
			allowedEmailDomains: false,
			disasterRecoveryRegion: true,
			friendlyURL: false,
			ownerEmailAddress: true,
			region: true,
			timeZone: false,
			workspaceName: true,
		});
	});

	it('returns the paas fields with their required flags', () => {
		expect(toRequiredByField('paas')).toEqual({
			admins: true,
			disasterRecoveryRegion: true,
			dxpVersion: true,
			projectId: true,
			region: true,
		});
	});

	it('returns the saas fields with their required flags', () => {
		expect(toRequiredByField('saas')).toEqual({
			admins: true,
			ownerEmailAddress: true,
			projectId: true,
			region: true,
		});
	});

	it('returns admin fields only for paas and saas', () => {
		expect(
			getCloudActivationAdminFields('paas').map(({name}) => name)
		).toEqual(['emailAddress', 'firstName', 'lastName', 'githubUsername']);
		expect(
			getCloudActivationAdminFields('saas').map(({name}) => name)
		).toEqual(['name', 'emailAddress']);
		expect(getCloudActivationAdminFields('analytics-cloud')).toEqual([]);
		expect(
			getCloudActivationAdminFields('paas').every(
				({required}) => required
			)
		).toBe(true);
	});

	it('kebab cases the paas region options from the data center names', () => {
		const regionField = getCloudActivationFields('paas').find(
			({environmentField}) => environmentField === 'region'
		);

		expect(regionField?.options).toContainEqual({
			label: 'iowa-usa',
			value: 'iowa-usa',
		});
		expect(regionField?.options).toHaveLength(15);
	});

	it('kebab cases the analytics cloud region labels and keeps the names as values', () => {
		const regionField = getCloudActivationFields('analytics-cloud').find(
			({environmentField}) => environmentField === 'region'
		);

		expect(regionField?.options).toContainEqual({
			label: 'frankfurt-germany',
			value: 'Frankfurt, Germany',
		});
		expect(regionField?.options).toHaveLength(5);
	});

	it('returns the cloud console for paas', () => {
		expect(
			getCloudConsoleURL('paas', toEnvironment({hostName: 'ignored'}))
		).toBe('https://console.liferay.cloud');
	});

	it('returns the host name URL, then the project ID URL, then empty for saas', () => {
		expect(
			getCloudConsoleURL(
				'saas',
				toEnvironment({hostName: 'acme.example.com', projectId: 'acme'})
			)
		).toBe('https://acme.example.com');
		expect(
			getCloudConsoleURL('saas', toEnvironment({projectId: 'acme'}))
		).toBe('https://acme.liferay.net');
		expect(getCloudConsoleURL('saas', toEnvironment({}))).toBe('');
	});

	it('returns the analytics URL otherwise', () => {
		expect(getCloudConsoleURL('analytics-cloud', toEnvironment({}))).toBe(
			'https://analytics.liferay.com'
		);
	});
});
