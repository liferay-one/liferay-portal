/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import adminSchemas from './adminSchemas';

const personalInformation = {
	businessEmailAddress: 'jane@liferay.com',
	companyName: '',
	country: 'US',
	fullName: 'Jane Doe',
	intlCode: {code: '+1', flag: 'us'},
	jobTitle: '',
	phoneNumber: '5550100',
};

const activationKey = {
	...personalInformation,
	domain: 'liferay.com',
	notifyMeAboutProducts: false,
	purpose: 'Testing',
	termsAndConditions: true,
	userAgreement: true,
};

const aiHubForm = {
	...personalInformation,
	administratorEmailAddress: 'admin@liferay.com',
	aiHubAccountName: 'Hub',
	purpose: 'Testing',
	termsAndConditions: true,
	userAgreement: true,
};

const provisioning = {
	_refAllowedEmailDomains: [],
	_refIncidentReportContacts: [],
	acceptTerms: true,
	allowedEmailDomains: ['liferay.com'],
	dataCenterLocation: 'us-east',
	incidentReportContacts: ['ops@liferay.com'],
	productName: 'Analytics Cloud',
	workspaceName: 'Workspace',
	workspaceOwnerEmail: 'owner@liferay.com',
};

const dsrLicenseKey = {
	acceptTermsAndConditions: true,
	dataCenterLocation: 'us-east',
	hostname: '',
	ipAddress: '',
	macAddress: '',
	workspaceName: 'Workspace',
	workspaceOwnerEmail: 'owner@liferay.com',
};

const ssaTrialForm = {
	duration: '30',
	objective: 'evaluation',
	projectId: 'abc123',
	siteInitializerKey: 'key',
};

describe('[MOD-SCHEMAS-ADMINSCHEMAS] adminSchemas', () => {
	it('activationKey requires accepted terms and user agreement', () => {
		expect(
			adminSchemas.activationKey.safeParse(activationKey).success
		).toBe(true);
		expect(
			adminSchemas.activationKey.safeParse({
				...activationKey,
				termsAndConditions: false,
			}).success
		).toBe(false);
		expect(
			adminSchemas.activationKey.safeParse({
				...activationKey,
				userAgreement: false,
			}).success
		).toBe(false);
	});

	it('activationKey validates the business email and minimum lengths', () => {
		expect(
			adminSchemas.activationKey.safeParse({
				...activationKey,
				businessEmailAddress: 'jane',
			}).success
		).toBe(false);
		expect(
			adminSchemas.activationKey.safeParse({
				...activationKey,
				domain: 'ab',
			}).success
		).toBe(false);
		expect(
			adminSchemas.activationKey.safeParse({
				...activationKey,
				companyName: 'ab',
			}).success
		).toBe(false);
	});

	it('aiHubForm requires terms, user agreement, and an admin email', () => {
		expect(adminSchemas.aiHubForm.safeParse(aiHubForm).success).toBe(true);
		expect(
			adminSchemas.aiHubForm.safeParse({
				...aiHubForm,
				termsAndConditions: false,
			}).success
		).toBe(false);
		expect(
			adminSchemas.aiHubForm.safeParse({
				...aiHubForm,
				userAgreement: false,
			}).success
		).toBe(false);
		expect(
			adminSchemas.aiHubForm.safeParse({
				...aiHubForm,
				administratorEmailAddress: 'admin',
			}).success
		).toBe(false);
	});

	it('analyticsProvisioning requires valid domains, contacts, and a workspace name of 3 or more', () => {
		const schema = adminSchemas.analyticsProvisioning;

		expect(schema.safeParse(provisioning).success).toBe(true);
		expect(
			schema.safeParse({...provisioning, allowedEmailDomains: undefined})
				.success
		).toBe(true);
		expect(
			schema.safeParse({...provisioning, allowedEmailDomains: ['bad']})
				.success
		).toBe(false);
		expect(
			schema.safeParse({...provisioning, incidentReportContacts: []})
				.success
		).toBe(false);
		expect(
			schema.safeParse({
				...provisioning,
				incidentReportContacts: ['not-an-email'],
			}).success
		).toBe(false);
		expect(
			schema.safeParse({...provisioning, workspaceName: 'ab'}).success
		).toBe(false);
		expect(
			schema.safeParse({...provisioning, acceptTerms: false}).success
		).toBe(false);
	});

	it('ldpProvisioning applies the same domain, contact, and workspace rules', () => {
		const schema = adminSchemas.ldpProvisioning;

		expect(schema.safeParse(provisioning).success).toBe(true);
		expect(
			schema.safeParse({
				...provisioning,
				allowedEmailDomains: ['liferay.com', 'nodot'],
			}).success
		).toBe(false);
		expect(
			schema.safeParse({...provisioning, incidentReportContacts: []})
				.success
		).toBe(false);
		expect(
			schema.safeParse({...provisioning, workspaceName: 'ab'}).success
		).toBe(false);
	});

	it('dsrLicenseKey needs at least one of hostname, IP, or MAC', () => {
		const result = adminSchemas.dsrLicenseKey.safeParse({
			...dsrLicenseKey,
			hostname: '  ',
		});

		expect(result.success).toBe(false);

		if (!result.success) {
			expect(result.error.issues[0].path).toEqual(['hostname']);
		}

		expect(
			adminSchemas.dsrLicenseKey.safeParse({
				...dsrLicenseKey,
				hostname: 'server',
			}).success
		).toBe(true);
		expect(
			adminSchemas.dsrLicenseKey.safeParse({
				...dsrLicenseKey,
				ipAddress: '10.0.0.1',
			}).success
		).toBe(true);
		expect(
			adminSchemas.dsrLicenseKey.safeParse({
				...dsrLicenseKey,
				macAddress: '00:1A:2B:3C:4D:5E',
			}).success
		).toBe(true);
	});

	it('dsrLicenseKey validates the IP and MAC on every line', () => {
		expect(
			adminSchemas.dsrLicenseKey.safeParse({
				...dsrLicenseKey,
				ipAddress: '10.0.0.1\n10.0.0.300',
			}).success
		).toBe(false);
		expect(
			adminSchemas.dsrLicenseKey.safeParse({
				...dsrLicenseKey,
				macAddress: '00:1A:2B:3C:4D:5E\n00:1A',
			}).success
		).toBe(false);
	});

	it('dsrLicenseKeyServerOnly makes workspace fields optional but keeps the one of three rule', () => {
		expect(
			adminSchemas.dsrLicenseKeyServerOnly.safeParse({
				acceptTermsAndConditions: true,
				hostname: 'server',
				workspaceOwnerEmail: '',
			}).success
		).toBe(true);
		expect(
			adminSchemas.dsrLicenseKeyServerOnly.safeParse({
				acceptTermsAndConditions: true,
			}).success
		).toBe(false);
	});

	it('extendSSATrial coerces the duration to an integer from 1 to 90', () => {
		const schema = adminSchemas.extendSSATrial;
		const result = schema.safeParse({duration: '45', reason: 'More time'});

		expect(result.success && result.data.duration).toBe(45);
		expect(schema.safeParse({duration: '0', reason: 'abc'}).success).toBe(
			false
		);
		expect(schema.safeParse({duration: '91', reason: 'abc'}).success).toBe(
			false
		);
		expect(schema.safeParse({duration: '1.5', reason: 'abc'}).success).toBe(
			false
		);
	});

	it('ssaTrialForm coerces the duration and requires an alphanumeric project ID of 3 or more', () => {
		const schema = adminSchemas.ssaTrialForm;
		const result = schema.safeParse(ssaTrialForm);

		expect(result.success && result.data.duration).toBe(30);
		expect(
			schema.safeParse({...ssaTrialForm, duration: '91'}).success
		).toBe(false);
		expect(
			schema.safeParse({...ssaTrialForm, projectId: 'ab'}).success
		).toBe(false);
		expect(
			schema.safeParse({...ssaTrialForm, projectId: 'abc-123'}).success
		).toBe(false);
		expect(schema.safeParse({...ssaTrialForm, objective: ''}).success).toBe(
			false
		);
	});

	it('ssaTrialForm rejects any invalid email in the optional email list', () => {
		const schema = adminSchemas.ssaTrialForm;

		expect(
			schema.safeParse({
				...ssaTrialForm,
				emailAddress: [{key: '1', label: 'a', value: 'a@liferay.com'}],
			}).success
		).toBe(true);
		expect(
			schema.safeParse({
				...ssaTrialForm,
				emailAddress: [
					{key: '1', label: 'a', value: 'a@liferay.com'},
					{key: '2', label: 'b', value: 'bad'},
				],
			}).success
		).toBe(false);
	});

	it('ssaInviteUsers needs a valid email and at least one role', () => {
		const schema = adminSchemas.ssaInviteUsers;

		expect(
			schema.safeParse({
				emailAddress: 'jane@liferay.com',
				roles: [{value: 'Admin'}],
			}).success
		).toBe(true);
		expect(
			schema.safeParse({emailAddress: 'jane@liferay.com', roles: []})
				.success
		).toBe(false);
		expect(
			schema.safeParse({emailAddress: 'jane', roles: [{value: 'Admin'}]})
				.success
		).toBe(false);
	});

	it('generateLicenseKey caps the description at 100 and validates IP and MAC lines', () => {
		const schema = adminSchemas.generateLicenseKey;
		const base = {description: 'My key', ipAddress: '', macAddress: ''};

		expect(schema.safeParse(base).success).toBe(true);
		expect(
			schema.safeParse({...base, description: 'x'.repeat(101)}).success
		).toBe(false);
		expect(schema.safeParse({...base, ipAddress: 'bad'}).success).toBe(
			false
		);
		expect(schema.safeParse({...base, macAddress: 'bad'}).success).toBe(
			false
		);
	});

	it('businessEventActual requires a date, a time, and a time zone key', () => {
		const schema = adminSchemas.businessEventActual;
		const businessEvent = {
			actualEventDate: '2026-03-15',
			actualEventTime: {hours: '10', minutes: '00'},
			extra: 'kept',
			timeZone: {key: 'UTC'},
		};

		const result = schema.safeParse({businessEvent});

		expect(result.success && result.data.businessEvent.extra).toBe('kept');
		expect(
			schema.safeParse({
				businessEvent: {...businessEvent, timeZone: {key: ''}},
			}).success
		).toBe(false);
		expect(
			schema.safeParse({
				businessEvent: {
					...businessEvent,
					actualEventTime: {hours: '--', minutes: '00'},
				},
			}).success
		).toBe(false);
	});
});
