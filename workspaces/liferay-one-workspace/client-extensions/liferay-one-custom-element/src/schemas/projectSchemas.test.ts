/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import projectSchemas from './projectSchemas';

const analyticsCloud = {
	friendlyURL: '/my-workspace',
	ownerEmailAddress: 'owner@liferay.com',
	region: 'us-east',
	workspaceName: 'Workspace',
};

const paasAdmin = {
	emailAddress: 'admin@liferay.com',
	firstName: 'Jane',
	githubUsername: 'jane',
	lastName: 'Doe',
};

const paas = {
	admins: [paasAdmin],
	dxpVersion: '2026.q1',
	projectId: 'acme1',
	region: 'us-east',
};

const saas = {
	admins: [{emailAddress: 'admin@liferay.com', name: 'Jane'}],
	ownerEmailAddress: 'owner@liferay.com',
	projectId: 'acme1',
	region: 'us-east',
};

function parseFriendlyURL(friendlyURL: string | undefined) {
	return projectSchemas.cloudActivationAnalyticsCloud.safeParse({
		...analyticsCloud,
		friendlyURL,
	});
}

describe('[MOD-SCHEMAS-PROJECTSCHEMAS] projectSchemas', () => {
	it('paas requires at least one admin with a valid email and required names', () => {
		const schema = projectSchemas.cloudActivationPaaS;

		expect(schema.safeParse(paas).success).toBe(true);
		expect(schema.safeParse({...paas, admins: []}).success).toBe(false);
		expect(
			schema.safeParse({
				...paas,
				admins: [{...paasAdmin, emailAddress: 'admin'}],
			}).success
		).toBe(false);
		expect(
			schema.safeParse({
				...paas,
				admins: [{...paasAdmin, firstName: ' '}],
			}).success
		).toBe(false);
		expect(
			schema.safeParse({
				...paas,
				admins: [{...paasAdmin, githubUsername: ''}],
			}).success
		).toBe(false);
	});

	it('paas requires region and dxpVersion', () => {
		const schema = projectSchemas.cloudActivationPaaS;

		expect(schema.safeParse({...paas, region: ''}).success).toBe(false);
		expect(schema.safeParse({...paas, dxpVersion: ''}).success).toBe(false);
	});

	it('saas requires at least one admin with a valid email and a name', () => {
		const schema = projectSchemas.cloudActivationSaaS;

		expect(schema.safeParse(saas).success).toBe(true);
		expect(schema.safeParse({...saas, admins: []}).success).toBe(false);
		expect(
			schema.safeParse({
				...saas,
				admins: [{emailAddress: 'admin@liferay.com', name: ''}],
			}).success
		).toBe(false);
		expect(
			schema.safeParse({...saas, ownerEmailAddress: 'owner'}).success
		).toBe(false);
		expect(schema.safeParse({...saas, region: ''}).success).toBe(false);
	});

	it('projectId is required and allows lowercase letters and numbers only', () => {
		const schema = projectSchemas.cloudActivationSaaS;

		expect(schema.safeParse({...saas, projectId: ''}).success).toBe(false);
		expect(schema.safeParse({...saas, projectId: 'Acme'}).success).toBe(
			false
		);
		expect(schema.safeParse({...saas, projectId: 'acme-1'}).success).toBe(
			false
		);

		const result = schema.safeParse({...saas, projectId: ' acme1 '});

		expect(result.success && result.data.projectId).toBe('acme1');
	});

	it('analytics cloud friendlyURL is optional when empty', () => {
		expect(parseFriendlyURL(undefined).success).toBe(true);
		expect(parseFriendlyURL('').success).toBe(true);
	});

	it('analytics cloud friendlyURL must start with a slash, have no spaces, and match the lowercase pattern', () => {
		expect(parseFriendlyURL('/my-workspace1').success).toBe(true);
		expect(parseFriendlyURL('my-workspace').success).toBe(false);
		expect(parseFriendlyURL('/my workspace').success).toBe(false);
		expect(parseFriendlyURL('/my.workspace').success).toBe(false);
		expect(parseFriendlyURL('/workspacE').success).toBe(false);
	});

	it('analytics cloud workspaceName is required and capped at 255', () => {
		const schema = projectSchemas.cloudActivationAnalyticsCloud;

		expect(
			schema.safeParse({
				...analyticsCloud,
				workspaceName: 'x'.repeat(255),
			}).success
		).toBe(true);
		expect(
			schema.safeParse({
				...analyticsCloud,
				workspaceName: 'x'.repeat(256),
			}).success
		).toBe(false);
		expect(
			schema.safeParse({...analyticsCloud, workspaceName: '  '}).success
		).toBe(false);
		expect(schema.safeParse({...analyticsCloud, region: ''}).success).toBe(
			false
		);
	});
});
