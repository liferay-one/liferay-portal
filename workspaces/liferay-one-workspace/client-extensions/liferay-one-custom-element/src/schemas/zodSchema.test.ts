/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import zodSchema, {z, zodResolver} from './zodSchema';

const personalInformation = {
	businessEmailAddress: 'jane@liferay.com',
	companyName: '',
	country: 'US',
	fullName: 'Jane Doe',
	intlCode: {code: '+1', flag: 'us'},
	jobTitle: '',
	phoneNumber: '5550100',
};

const seoStudioForm = {
	...personalInformation,
	administratorEmailAddress: 'admin@liferay.com',
	companyName: 'Acme',
	purpose: 'Testing',
	seoStudioAccountName: 'SEO',
	termsAndConditions: true,
	userAgreement: true,
};

const billingAddress = {
	city: 'Diamond Bar',
	country: 'United States',
	name: 'HQ',
	street1: '1400 Montefino Ave',
	zip: '91765',
};

const accountForm = {
	accountName: 'Liferay',
	accountType: 'business',
	billingAddress,
	emailAddress: 'billing@liferay.com',
	taxNumber: '123',
};

const ldpProvisioning = {
	_refAllowedEmailDomains: [],
	_refIncidentReportContacts: [],
	agreementAcceptance: true,
	dataCenterLocation: 'us-east',
	dataProcessingConsent: true,
	incidentReportContacts: ['ops@liferay.com'],
	workspaceName: 'Workspace',
	workspaceOwnerEmail: 'owner@liferay.com',
};

const supportURLs = {
	appUsageTermsURL: '',
	documentationURL: '',
	installationGuideURL: '',
	url: '',
};

describe('[MOD-SCHEMAS-ZODSCHEMA] zodSchema', () => {
	it('re-exports z and zodResolver for the form callers', () => {
		expect(typeof z.object).toBe('function');
		expect(typeof zodResolver).toBe('function');
	});

	it('seoStudioForm requires the account name, admin email, company name, purpose, and both consents', () => {
		const schema = zodSchema.seoStudioForm;

		expect(schema.safeParse(seoStudioForm).success).toBe(true);
		expect(
			schema.safeParse({...seoStudioForm, seoStudioAccountName: 'SE'})
				.success
		).toBe(false);
		expect(
			schema.safeParse({
				...seoStudioForm,
				administratorEmailAddress: 'admin',
			}).success
		).toBe(false);
		expect(
			schema.safeParse({...seoStudioForm, termsAndConditions: false})
				.success
		).toBe(false);
		expect(
			schema.safeParse({...seoStudioForm, userAgreement: false}).success
		).toBe(false);
		expect(
			schema.safeParse({...seoStudioForm, fullName: 'Ja'}).success
		).toBe(false);
		expect(
			schema.safeParse({...seoStudioForm, companyName: ''}).success
		).toBe(false);
	});

	it('aiHubForm and aiHubOpenBetaForm require an AI Hub account name and admin email', () => {
		const openBeta = {
			...personalInformation,
			administratorEmailAddress: 'admin@liferay.com',
			aiHubAccountName: 'Hub',
		};

		expect(zodSchema.aiHubOpenBetaForm.safeParse(openBeta).success).toBe(
			true
		);
		expect(
			zodSchema.aiHubOpenBetaForm.safeParse({
				...openBeta,
				aiHubAccountName: 'Hu',
			}).success
		).toBe(false);
		expect(
			zodSchema.aiHubForm.safeParse({
				...openBeta,
				purpose: 'Testing',
				termsAndConditions: true,
				userAgreement: false,
			}).success
		).toBe(false);
		expect(
			zodSchema.aiHubForm.safeParse({
				...openBeta,
				purpose: 'Testing',
				termsAndConditions: true,
				userAgreement: true,
			}).success
		).toBe(true);
	});

	it('activationKey requires accepted consents', () => {
		const activationKey = {
			...personalInformation,
			domain: 'liferay.com',
			notifyMeAboutProducts: false,
			purpose: 'Testing',
			termsAndConditions: true,
			userAgreement: true,
		};

		expect(zodSchema.activationKey.safeParse(activationKey).success).toBe(
			true
		);
		expect(
			zodSchema.activationKey.safeParse({
				...activationKey,
				termsAndConditions: false,
			}).success
		).toBe(false);
	});

	it('accountForm makes the billing phone optional and requires the other address fields', () => {
		const schema = zodSchema.accountForm;

		expect(schema.safeParse(accountForm).success).toBe(true);
		expect(
			schema.safeParse({
				...accountForm,
				billingAddress: {...billingAddress, zip: ''},
			}).success
		).toBe(false);
		expect(schema.safeParse({...accountForm, taxNumber: ''}).success).toBe(
			false
		);
		expect(
			schema.safeParse({...accountForm, emailAddress: 'billing'}).success
		).toBe(false);
	});

	it('ldpProvisioning requires both agreement and data processing consent', () => {
		const schema = zodSchema.ldpProvisioning;

		expect(schema.safeParse(ldpProvisioning).success).toBe(true);
		expect(
			schema.safeParse({...ldpProvisioning, agreementAcceptance: false})
				.success
		).toBe(false);
		expect(
			schema.safeParse({...ldpProvisioning, dataProcessingConsent: false})
				.success
		).toBe(false);
		expect(
			schema.safeParse({...ldpProvisioning, allowedEmailDomains: ['bad']})
				.success
		).toBe(false);
	});

	it('dsrLicenseKey needs one of hostname, IP, or MAC with valid IP lines', () => {
		const dsr = {
			acceptTermsAndConditions: true,
			dataCenterLocation: 'us-east',
			workspaceName: 'Workspace',
			workspaceOwnerEmail: 'owner@liferay.com',
		};

		expect(zodSchema.dsrLicenseKey.safeParse(dsr).success).toBe(false);
		expect(
			zodSchema.dsrLicenseKey.safeParse({...dsr, ipAddress: '10.0.0.1'})
				.success
		).toBe(true);
		expect(
			zodSchema.dsrLicenseKey.safeParse({...dsr, ipAddress: '10.0.0'})
				.success
		).toBe(false);
	});

	it('ssaTrialForm coerces the duration and requires an alphanumeric project ID', () => {
		const form = {
			duration: '90',
			objective: 'evaluation',
			projectId: 'abc',
			siteInitializerKey: 'key',
		};

		expect(zodSchema.ssaTrialForm.safeParse(form).success).toBe(true);
		expect(
			zodSchema.ssaTrialForm.safeParse({...form, duration: '91'}).success
		).toBe(false);
		expect(
			zodSchema.ssaTrialForm.safeParse({...form, projectId: 'a_b'})
				.success
		).toBe(false);
	});

	it('productFeedback keeps ratings between 0 and 5', () => {
		const feedback = {emailAddress: 'jane@liferay.com', fullName: 'Jane'};

		expect(zodSchema.productFeedback.safeParse(feedback).success).toBe(
			true
		);
		expect(
			zodSchema.productFeedback.safeParse({
				...feedback,
				ratingSatisfaction: 6,
			}).success
		).toBe(false);
	});

	it('appPublishing validates the profile, build, storefront, and version steps', () => {
		const {appPublishing} = zodSchema;

		expect(
			appPublishing.profile.safeParse({
				areas: ['a'],
				categories: {label: 'L', value: 'v'},
				description: 'Desc',
				name: 'App',
				tags: [],
			}).success
		).toBe(false);
		expect(
			appPublishing.build.safeParse({
				appType: 'osgi',
				liferayPackages: [],
			}).success
		).toBe(false);
		expect(
			appPublishing.storefront.safeParse({
				images: Array.from({length: 11}, () => ({})),
			}).success
		).toBe(false);
		expect(appPublishing.version.safeParse({version: '1.0'}).success).toBe(
			true
		);
	});

	it('appPublishing support requires contact details for a paid app and allows blanks for a free app', () => {
		const {supportForFreeApp, supportForPaidApp} =
			zodSchema.appPublishing.support;
		const blank = {
			...supportURLs,
			email: '',
			phone: '',
			publisherWebsiteURL: '',
		};

		expect(supportForFreeApp.safeParse(blank).success).toBe(true);
		expect(supportForPaidApp.safeParse(blank).success).toBe(false);
		expect(
			supportForPaidApp.safeParse({
				...supportURLs,
				email: 'publisher@liferay.com',
				phone: '12345678',
				publisherWebsiteURL: 'https://liferay.com',
			}).success
		).toBe(true);
	});

	it('solutionPublishing validates details, header, company, and contact email', () => {
		const {solutionPublishing} = zodSchema;
		const block = {
			content: {description: '<p>Body</p>', title: 'Title'},
			type: 'text-block',
		};

		expect(solutionPublishing.details.safeParse([block]).success).toBe(
			false
		);
		expect(
			solutionPublishing.details.safeParse([block, block]).success
		).toBe(true);
		expect(
			solutionPublishing.header.safeParse({
				contentType: {
					content: {headerImages: [{}]},
					type: 'upload-images',
				},
				description: '<p></p>',
				title: 'Header',
			}).success
		).toBe(false);
		expect(
			solutionPublishing.company.safeParse({
				description: '<p>About</p>',
				email: 'company@liferay.com',
				phone: '1',
				website: 'liferay.com',
			}).success
		).toBe(true);
		expect(solutionPublishing.contactUs.safeParse('contact').success).toBe(
			false
		);
	});

	it('becomePublisherForm requires names and a request description of 3 or more', () => {
		const form = {
			emailAddress: 'jane@liferay.com',
			firstName: 'Jane',
			lastName: 'Doe',
			phoneNumber: '5550100',
			publisherType: ['app'],
			requestDescription: 'Please',
		};

		expect(zodSchema.becomePublisherForm.safeParse(form).success).toBe(
			true
		);
		expect(
			zodSchema.becomePublisherForm.safeParse({...form, firstName: 'Ja'})
				.success
		).toBe(false);
		expect(
			zodSchema.becomePublisherForm.safeParse({
				...form,
				requestDescription: 'Pl',
			}).success
		).toBe(false);
	});
});
