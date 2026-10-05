/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import commerceSchemas from './commerceSchemas';

const accountCreator = {
	companyName: 'Liferay',
	country: 'US',
	emailAddress: 'jane@liferay.com',
	familyName: 'Doe',
	givenName: 'Jane',
	phone: {code: '+1', flag: 'us'},
	phoneNumber: '5550100',
};

const billingAddress = {
	city: 'Diamond Bar',
	country: 'United States',
	name: 'HQ',
	phoneNumber: '5550100',
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

const activationKey = {
	businessEmailAddress: 'jane@liferay.com',
	companyName: 'Liferay',
	country: 'US',
	domain: 'liferay.com',
	fullName: 'Jane Doe',
	purpose: 'Testing',
	termsAndConditions: true,
	userAgreement: true,
};

const contactSales = {
	accountName: 'Liferay',
	additionalAppsRequested: '',
	comments: '',
	email: 'jane@liferay.com',
	name: 'Jane',
};

const invitedNewMember = {
	emailAddress: 'jane@liferay.com',
	firstName: 'Jane',
	lastName: 'Doe',
	roles: ['Account Member'],
};

const newLicenseKey = {
	domains: 'liferay.com',
	environmentName: 'Production',
	keyType: 'production',
	startDate: '2026-01-01',
};

describe('[MOD-SCHEMAS-COMMERCESCHEMAS] commerceSchemas', () => {
	it('accountCreator requires company, country, email, family name, and phone number', () => {
		const schema = commerceSchemas.accountCreator;

		expect(schema.safeParse(accountCreator).success).toBe(true);
		expect(
			schema.safeParse({...accountCreator, companyName: ''}).success
		).toBe(false);
		expect(
			schema.safeParse({...accountCreator, country: 'U'}).success
		).toBe(false);
		expect(
			schema.safeParse({...accountCreator, emailAddress: 'jane'}).success
		).toBe(false);
		expect(
			schema.safeParse({...accountCreator, familyName: 'Do'}).success
		).toBe(false);
		expect(
			schema.safeParse({...accountCreator, phoneNumber: ''}).success
		).toBe(false);
	});

	it('accountForm requires a name, type, tax number, valid email, and a complete billing address', () => {
		const schema = commerceSchemas.accountForm;

		expect(schema.safeParse(accountForm).success).toBe(true);
		expect(schema.safeParse({...accountForm, taxNumber: ''}).success).toBe(
			false
		);
		expect(
			schema.safeParse({...accountForm, emailAddress: 'billing'}).success
		).toBe(false);
		expect(
			schema.safeParse({
				...accountForm,
				billingAddress: {...billingAddress, street1: ''},
			}).success
		).toBe(false);
		expect(
			schema.safeParse({
				...accountForm,
				billingAddress: {...billingAddress, phoneNumber: ''},
			}).success
		).toBe(false);
	});

	it('activationKey requires accepted consent and minimum lengths', () => {
		const schema = commerceSchemas.activationKey;

		expect(schema.safeParse(activationKey).success).toBe(true);
		expect(
			schema.safeParse({...activationKey, termsAndConditions: false})
				.success
		).toBe(false);
		expect(
			schema.safeParse({...activationKey, userAgreement: false}).success
		).toBe(false);
		expect(
			schema.safeParse({...activationKey, purpose: 'ab'}).success
		).toBe(false);
		expect(
			schema.safeParse({...activationKey, businessEmailAddress: 'jane'})
				.success
		).toBe(false);
	});

	it('contactSales requires a name and account name of 3 or more and a valid email', () => {
		const schema = commerceSchemas.contactSales;

		expect(schema.safeParse(contactSales).success).toBe(true);
		expect(schema.safeParse({...contactSales, name: 'Ja'}).success).toBe(
			false
		);
		expect(
			schema.safeParse({...contactSales, accountName: 'Li'}).success
		).toBe(false);
		expect(schema.safeParse({...contactSales, email: 'jane'}).success).toBe(
			false
		);
	});

	it('invitedNewMember validates names and email', () => {
		const schema = commerceSchemas.invitedNewMember;
		const fiveRoles = ['a', 'b', 'c', 'd', 'e'];

		expect(
			schema.safeParse({...invitedNewMember, roles: fiveRoles}).success
		).toBe(true);
		expect(
			schema.safeParse({
				...invitedNewMember,
				firstName: 'Ja',
				roles: fiveRoles,
			}).success
		).toBe(false);
		expect(
			schema.safeParse({
				...invitedNewMember,
				emailAddress: 'jane',
				roles: fiveRoles,
			}).success
		).toBe(false);
	});

	it('invitedNewMember rejects fewer than 5 roles as written, despite the at least one role message', () => {
		const result =
			commerceSchemas.invitedNewMember.safeParse(invitedNewMember);

		expect(result.success).toBe(false);

		if (!result.success) {
			expect(result.error.issues[0].message).toBe(
				'Please select at least one role'
			);
		}
	});

	it('newLicenseKey requires domains of 3 or more, environment, key type, and start date', () => {
		const schema = commerceSchemas.newLicenseKey;

		expect(schema.safeParse(newLicenseKey).success).toBe(true);
		expect(
			schema.safeParse({...newLicenseKey, domains: 'ab'}).success
		).toBe(false);
		expect(
			schema.safeParse({...newLicenseKey, environmentName: ''}).success
		).toBe(false);
		expect(schema.safeParse({...newLicenseKey, keyType: ''}).success).toBe(
			false
		);
		expect(
			schema.safeParse({...newLicenseKey, startDate: ''}).success
		).toBe(false);
	});

	it('productFeedback requires a name and email and keeps ratings between 0 and 5', () => {
		const schema = commerceSchemas.productFeedback;
		const feedback = {
			emailAddress: 'jane@liferay.com',
			fullName: 'Jane',
			ratingEaseOfUse: 0,
			ratingSatisfaction: 5,
		};

		expect(schema.safeParse(feedback).success).toBe(true);
		expect(
			schema.safeParse({...feedback, ratingUsefulness: 6}).success
		).toBe(false);
		expect(
			schema.safeParse({...feedback, ratingEaseOfUse: -1}).success
		).toBe(false);
		expect(schema.safeParse({...feedback, fullName: ''}).success).toBe(
			false
		);
		expect(schema.safeParse({...feedback, emailAddress: ''}).success).toBe(
			false
		);
	});

	it('trialForm requires a product and valid invite emails', () => {
		const schema = commerceSchemas.trialForm;
		const trial = {
			consoleInviteEmailAddresses: ['jane@liferay.com'],
			product: {id: 1},
			sendNotificationEmail: true,
		};

		expect(schema.safeParse(trial).success).toBe(true);
		expect(schema.safeParse({...trial, product: null}).success).toBe(false);
		expect(
			schema.safeParse({...trial, consoleInviteEmailAddresses: ['bad']})
				.success
		).toBe(false);
		expect(
			schema.safeParse({...trial, sendNotificationEmail: undefined})
				.success
		).toBe(false);
	});
});
