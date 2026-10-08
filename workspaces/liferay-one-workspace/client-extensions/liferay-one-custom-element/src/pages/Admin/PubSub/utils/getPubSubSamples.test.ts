/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getPubSubSamples from './getPubSubSamples';

function generate(subscriberName: string, label: string, group?: string) {
	const sample = getPubSubSamples(subscriberName).find(
		(sample) => sample.label === label && sample.group === group
	);

	if (!sample) {
		throw new Error(`No sample ${label} for ${subscriberName}`);
	}

	const message = sample.generate();

	return {...message, payload: JSON.parse(message.payload)};
}

describe('[MOD-ADMIN-PUBSUB-GETPUBSUBSAMPLES] getPubSubSamples', () => {
	it('returns no samples for an unknown or missing subscriber', () => {
		expect(getPubSubSamples('UnknownPubsubSubscriber')).toEqual([]);
		expect(getPubSubSamples()).toEqual([]);
	});

	it('generates one Okta users sample per event type, with a group only for membership events', () => {
		const samples = getPubSubSamples('OktaUsersPubsubSubscriber');

		expect(samples.map((sample) => sample.label)).toContain(
			'user.lifecycle.deactivate'
		);

		const create = generate(
			'OktaUsersPubsubSubscriber',
			'user.lifecycle.create'
		);

		expect(create.attributes).toBe('');
		expect(create.payload.eventType).toBe('user.lifecycle.create');
		expect(create.payload.group).toBeUndefined();
		expect(create.payload.user.email).toMatch(/@example\.com$/);

		const add = generate(
			'OktaUsersPubsubSubscriber',
			'group.user_membership.add'
		);

		expect(add.payload.group.id).toMatch(/^00g/);
	});

	it('generates Salesforce object records whose action and object name match the sample', () => {
		const message = generate(
			'SalesforceObjectPubsubSubscriber',
			'delete',
			'ProjectEntitlementLineItem__c'
		);

		expect(message.payload.action).toBe('delete');
		expect(message.payload.salesforceObjectName).toBe(
			'ProjectEntitlementLineItem__c'
		);
		expect(message.payload.records[0].ProjectEntitlement__c).toMatch(
			/^a1E/
		);

		const account = generate(
			'SalesforceObjectPubsubSubscriber',
			'update',
			'Account'
		);

		expect(account.payload.records[0].Active_Subscription__c).toBe(true);
		expect(account.payload.records[0].Id).toHaveLength(18);
	});

	it('links the account, opportunity, and project IDs in an opportunity sample', () => {
		const message = generate(
			'SalesforceOpportunityPubsubSubscriber',
			'New Business, Closed Won',
			'Opportunity'
		);

		const [record] = message.payload.records;

		expect(record.opportunity.StageName).toBe('Closed Won');
		expect(record.opportunity.Type).toBe('New Business');
		expect(record.opportunity.AccountId).toBe(record.account.Id);
		expect(record.opportunity.Project__c).toBe(record.project.Id);
		expect(record.opportunityLineItems[0].ServiceDate).toMatch(
			/^\d{4}-\d{2}-\d{2}$/
		);
	});

	it('generates new IDs on every call', () => {
		const first = generate(
			'OktaAppCreatedPubsubSubscriber',
			'accountKey, appId'
		);
		const second = generate(
			'OktaAppCreatedPubsubSubscriber',
			'accountKey, appId'
		);

		expect(first.payload.appId).not.toBe(second.payload.appId);
	});

	it('adds the dead letter source attributes to dead letter samples', () => {
		const message = generate(
			'SalesforceDeadLetterPubsubSubscriber',
			'update',
			'Contract'
		);

		expect(message.attributes.split('\n')).toEqual([
			'CloudPubSubDeadLetterSourceDeliveryCount=5',
			'CloudPubSubDeadLetterSourceSubscription=salesforce-object-subscription',
		]);
		expect(message.payload.salesforceObjectName).toBe('Contract');
	});
});
