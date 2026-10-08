/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

export type PubSubMessage = {
	attributes: string;
	payload: string;
};

export type PubSubSample = {
	generate: () => PubSubMessage;
	group?: string;
	label: string;
};

type SalesforceIds = {
	accountId: string;
	contractId: string;
	opportunityId: string;
	opportunityLineItemId: string;
	pricebook2Id: string;
	pricebookEntryId: string;
	product2Id: string;
	projectEntitlementId: string;
	projectEntitlementLineItemId: string;
	projectId: string;
};

const ID_CHARACTERS =
	'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const OKTA_USER_EVENT_TYPES = [
	'user.lifecycle.create',
	'user.lifecycle.activate',
	'user.lifecycle.deactivate',
	'user.account.update_profile',
	'user.account.update_password',
	'group.user_membership.add',
	'group.user_membership.remove',
];

function addYears(date: Date, years: number) {
	const newDate = new Date(date);

	newDate.setUTCFullYear(newDate.getUTCFullYear() + years);

	return newDate;
}

function getDeadLetterAttributes(sourceSubscription: string) {
	return toAttributes({
		CloudPubSubDeadLetterSourceDeliveryCount: '5',
		CloudPubSubDeadLetterSourceSubscription: sourceSubscription,
	});
}

function getOktaUsersPayload(eventType: string) {
	const id = getRandomString(8).toLowerCase();

	return {
		eventType,
		...(eventType.startsWith('group.') && {
			group: {
				displayName: 'Liferay One Sample Group',
				id: `00g${getRandomString(17)}`,
			},
		}),
		user: {
			email: `sample.user.${id}@example.com`,
			firstName: 'Sample',
			lastName: 'User',
			middleName: '',
			status:
				eventType === 'user.lifecycle.deactivate'
					? 'DEPROVISIONED'
					: 'ACTIVE',
			uuid: `00u${getRandomString(17)}`,
		},
	};
}

function getRandomString(length: number) {
	let randomString = '';

	for (let i = 0; i < length; i++) {
		randomString += ID_CHARACTERS.charAt(
			Math.floor(Math.random() * ID_CHARACTERS.length)
		);
	}

	return randomString;
}

function getSalesforceAccount(ids: SalesforceIds) {
	return {
		Account_Tier__c: 'Tier 1',
		Active_Subscription__c: true,
		BillingCity: 'Diamond Bar',
		BillingCountry: 'United States',
		BillingPostalCode: '91765',
		BillingState: 'California',
		BillingStreet: '1400 Montefino Avenue',
		CurrencyIsoCode: 'USD',
		Description: 'Sample account generated from the Pub/Sub admin page',
		Fax: '',
		Id: ids.accountId,
		Name: `Sample Account ${ids.accountId.slice(-6)}`,
		Owner_Email__c: 'sample.owner@example.com',
		Phone: '+1 877 543 3729',
		ShippingCity: 'Diamond Bar',
		ShippingCountry: 'United States',
		ShippingPostalCode: '91765',
		ShippingState: 'California',
		ShippingStreet: '1400 Montefino Avenue',
		Website: 'https://www.example.com',
	};
}

function getSalesforceId(keyPrefix: string) {
	return keyPrefix + getRandomString(15);
}

function getSalesforceIds(): SalesforceIds {
	return {
		accountId: getSalesforceId('001'),
		contractId: getSalesforceId('800'),
		opportunityId: getSalesforceId('006'),
		opportunityLineItemId: getSalesforceId('00k'),
		pricebook2Id: getSalesforceId('01s'),
		pricebookEntryId: getSalesforceId('01u'),
		product2Id: getSalesforceId('01t'),
		projectEntitlementId: getSalesforceId('a1E'),
		projectEntitlementLineItemId: getSalesforceId('a1F'),
		projectId: getSalesforceId('a0X'),
	};
}

function getSalesforceObjectPayload(
	action: string,
	salesforceObjectName: string
) {
	const ids = getSalesforceIds();

	return {
		action,
		records: [getSalesforceObjectRecord(ids, salesforceObjectName)],
		salesforceObjectName,
	};
}

function getSalesforceObjectRecord(
	ids: SalesforceIds,
	salesforceObjectName: string
) {
	const endDate = toDateString(addYears(new Date(), 1));
	const startDate = toDateString(new Date());

	if (salesforceObjectName === 'Account') {
		return getSalesforceAccount(ids);
	}
	else if (salesforceObjectName === 'Contract') {
		return {
			AccountId: ids.accountId,
			ContractTerm: 12,
			EndDate: endDate,
			Id: ids.contractId,
			SBQQ__Opportunity__c: ids.opportunityId,
			StartDate: startDate,
		};
	}
	else if (salesforceObjectName === 'PricebookEntry') {
		return {
			CurrencyIsoCode: 'USD',
			Id: ids.pricebookEntryId,
			IsActive: true,
			Pricebook2Id: ids.pricebook2Id,
			Product2Id: ids.product2Id,
			UnitPrice: 1000,
		};
	}
	else if (salesforceObjectName === 'Product2') {
		return {
			Description: 'Sample product generated from the Pub/Sub admin page',
			Id: ids.product2Id,
			Name: 'Sample Product',
			Product_Group__c: 'DXP',
		};
	}
	else if (salesforceObjectName === 'Project__c') {
		return getSalesforceProject(ids);
	}
	else if (salesforceObjectName === 'ProjectEntitlement__c') {
		return {
			Id: ids.projectEntitlementId,
			Project__c: ids.projectId,
			Purchasing_Opportunity__c: ids.opportunityId,
		};
	}

	return {
		CurrencyIsoCode: 'USD',
		End_Date__c: endDate,
		Id: ids.projectEntitlementLineItemId,
		Product2__c: ids.product2Id,
		ProjectEntitlement__c: ids.projectEntitlementId,
		Quantity__c: 1,
		Start_Date__c: startDate,
	};
}

function getSalesforceOpportunityPayload(stageName: string, type: string) {
	const ids = getSalesforceIds();

	const endDate = toDateString(addYears(new Date(), 1));

	return {
		records: [
			{
				account: {
					...getSalesforceAccount(ids),
					'Owner.Email': 'sample.owner@example.com',
				},
				opportunity: {
					'AccountId': ids.accountId,
					'First_Line_Support__c': false,
					'Has_Renewal__c': 0,
					'Id': ids.opportunityId,
					'Name': `Sample Opportunity ${ids.opportunityId.slice(-6)}`,
					'Owner.Email': 'sample.owner@example.com',
					'Owner.FirstName': 'Sample',
					'Owner.LastName': 'Owner',
					'Pricebook2Id': ids.pricebook2Id,
					'Product_Family__c': 'E',
					'Project__c': ids.projectId,
					'Reseller__r.Name': '',
					'Sold_By__c': '',
					'StageName': stageName,
					'Type': type,
				},
				opportunityLineItems: [
					{
						'Cloud_Region__c': '',
						'CurrencyIsoCode': 'USD',
						'End_Date__c': endDate,
						'Id': ids.opportunityLineItemId,
						'Machine_Type__c': '',
						'Number_of_Pods__c': 0,
						'Product_Type__c': 'Subscription',
						'Product2.Name': 'Sample Product',
						'Product2Id': ids.product2Id,
						'Quantity': 1,
						'ServiceDate': toDateString(new Date()),
						'TotalPrice': 1000,
						'UnitPrice': 1000,
					},
				],
				project: getSalesforceProject(ids),
				projectContactRoles: [
					{
						'Contact__r.Email': 'sample.contact@example.com',
						'Contact__r.FirstName': 'Sample',
						'Contact__r.LastName': 'Contact',
						'Contact_Role__c': 'Administrator',
						'Project__c': ids.projectId,
					},
				],
			},
		],
	};
}

function getSalesforceProject(ids: SalesforceIds) {
	return {
		AI_Hub_Account_Name__c: '',
		Account__c: ids.accountId,
		Allowed_Email_Domains__c: 'example.com',
		Data_Center_Location__c: '',
		Id: ids.projectId,
		LDP_Workspace_Name__c: '',
		Liferay_Version__c: '',
		Name: `Sample Project ${ids.projectId.slice(-6)}`,
	};
}

function toAttributes(attributes: Record<string, string>) {
	return Object.entries(attributes)
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');
}

function toDateString(date: Date) {
	return date.toISOString().slice(0, 10);
}

function toMessage(payload: object, attributes = ''): PubSubMessage {
	return {
		attributes,
		payload: JSON.stringify(payload, null, '\t'),
	};
}

function withDeadLetterAttributes(
	samples: PubSubSample[],
	sourceSubscription: string
): PubSubSample[] {
	return samples.map((sample) => ({
		...sample,
		generate: () => ({
			...sample.generate(),
			attributes: getDeadLetterAttributes(sourceSubscription),
		}),
	}));
}

const OKTA_USERS_SAMPLES: PubSubSample[] = OKTA_USER_EVENT_TYPES.map(
	(eventType) => ({
		generate: () => toMessage(getOktaUsersPayload(eventType)),
		label: eventType,
	})
);

const SALESFORCE_OBJECT_ACTIONS: [string, string[]][] = [
	['Account', ['update']],
	['Contract', ['insert', 'update']],
	['PricebookEntry', ['update', 'delete']],
	['Product2', ['update', 'delete']],
	['Project__c', ['update']],
	['ProjectEntitlement__c', ['update', 'delete']],
	['ProjectEntitlementLineItem__c', ['update', 'delete']],
];

const SALESFORCE_OBJECT_SAMPLES: PubSubSample[] =
	SALESFORCE_OBJECT_ACTIONS.flatMap(([salesforceObjectName, actions]) =>
		actions.map((action) => ({
			generate: () =>
				toMessage(
					getSalesforceObjectPayload(action, salesforceObjectName)
				),
			group: salesforceObjectName,
			label: action,
		}))
	);

const SALESFORCE_OPPORTUNITY_SAMPLES: PubSubSample[] = [
	['New Business', 'Closed Won'],
	['Renewal', 'Closed Won'],
	['Renewal', 'Closed Lost'],
].map(([type, stageName]) => ({
	generate: () => toMessage(getSalesforceOpportunityPayload(stageName, type)),
	group: 'Opportunity',
	label: `${type}, ${stageName}`,
}));

const PUB_SUB_SAMPLES: Record<string, PubSubSample[]> = {
	OktaAppCreatedPubsubSubscriber: [
		{
			generate: () =>
				toMessage({
					accountKey: getSalesforceId('001'),
					appId: `0oa${getRandomString(17)}`,
				}),
			label: 'accountKey, appId',
		},
	],
	OktaDeadLetterPubsubSubscriber: withDeadLetterAttributes(
		OKTA_USERS_SAMPLES,
		'okta-users-subscription'
	),
	OktaUsersPubsubSubscriber: OKTA_USERS_SAMPLES,
	SalesforceDeadLetterPubsubSubscriber: withDeadLetterAttributes(
		[...SALESFORCE_OBJECT_SAMPLES, ...SALESFORCE_OPPORTUNITY_SAMPLES],
		'salesforce-object-subscription'
	),
	SalesforceObjectPubsubSubscriber: SALESFORCE_OBJECT_SAMPLES,
	SalesforceOpportunityPubsubSubscriber: SALESFORCE_OPPORTUNITY_SAMPLES,
};

export default function getPubSubSamples(
	subscriberName?: string
): PubSubSample[] {
	return (subscriberName && PUB_SUB_SAMPLES[subscriberName]) || [];
}
