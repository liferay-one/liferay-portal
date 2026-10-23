/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {Word} from '~/i18n';
import type {
	InspectedCollectionKey,
	InspectedEntry,
	InspectedOrder,
	InspectedUser,
} from '~/types/accountInspection';

export type InspectedCollectionColumn = {
	hidden?: boolean;
	label: Word;
	value: (entry: InspectedEntry, accountId: number) => unknown;
};

function field(label: Word, fieldName: string): InspectedCollectionColumn {
	return {label, value: (entry) => entry[fieldName]};
}

function hiddenField(
	label: Word,
	fieldName: string
): InspectedCollectionColumn {
	return {...field(label, fieldName), hidden: true};
}

const ERC_COLUMN = field('external-reference-code', 'externalReferenceCode');

const ID_COLUMN = field('id', 'id');

const STATUS_COLUMN = field('status', 'status');

const projectColumn = (relationshipName: string) =>
	field('project', `r_${relationshipName}_c_projectERC`);

const contractColumn = (relationshipName: string) =>
	field('contract', `r_${relationshipName}_c_contractERC`);

const END_DATE_COLUMN = field('end-date', 'endDate');

export const INSPECTED_COLLECTION_COLUMNS: Record<
	InspectedCollectionKey,
	InspectedCollectionColumn[]
> = {
	account: [],
	accountInvitations: [
		ID_COLUMN,
		field('email-address', 'emailAddress'),
		field('project', 'projectExternalReferenceCode'),
		field('accepted', 'accepted'),
		field('expiration-date', 'customExpirationDate'),
		hiddenField('roles', 'roleExternalReferenceCodes'),
		hiddenField('date-created', 'dateCreated'),
	],
	accountNotes: [
		ID_COLUMN,
		field('type', 'type'),
		field('status', 'customStatus'),
		field('created-by', 'createdByUserName'),
		field('content', 'content'),
		hiddenField('priority', 'priority'),
		hiddenField('date-created', 'dateCreated'),
	],
	activationKeys: [
		ID_COLUMN,
		ERC_COLUMN,
		projectColumn('projectToActivationKey'),
		field('active', 'active'),
		END_DATE_COLUMN,
		hiddenField('type', 'type'),
		hiddenField('license-key-family', 'licenseKeyFamily'),
		hiddenField('start-date', 'startDate'),
	],
	contracts: [
		ID_COLUMN,
		ERC_COLUMN,
		projectColumn('projectToContract'),
		field('start-date', 'startDate'),
		END_DATE_COLUMN,
		hiddenField('type', 'contractType'),
		{...contractColumn('originalContractToContract'), hidden: true},
		hiddenField('renewal-state', 'renewalState'),
	],
	entitlements: [
		ID_COLUMN,
		field('name', 'name'),
		projectColumn('projectToEntitlement'),
		contractColumn('contractToEntitlement'),
		END_DATE_COLUMN,
		hiddenField('sku', 'skuExternalReferenceCode'),
		hiddenField('quantity', 'quantity'),
		hiddenField(
			'entitlement-definition',
			'r_entitlementDefinitionToEntitlement_c_entitlementDefinitionERC'
		),
		hiddenField(
			'order-item',
			'r_commerceOrderItemToEntitlement_commerceOrderItemId'
		),
		hiddenField('start-date', 'startDate'),
	],
	environments: [
		ID_COLUMN,
		field('name', 'name'),
		projectColumn('projectToEnvironment'),
		contractColumn('contractToEnvironment'),
		field('activation-status', 'activationStatus'),
		hiddenField('offering', 'offering'),
		hiddenField('host-name', 'hostName'),
	],
	licenseKeys: [
		ID_COLUMN,
		field('name', 'name'),
		projectColumn('projectToLicenseKey'),
		field('entitlement', 'entitlementId'),
		field('order', 'orderId'),
		hiddenField('license-key-family', 'licenseKeyFamily'),
		hiddenField('license-type', 'licenseType'),
		hiddenField('active', 'active'),
	],
	oauth2DxpAuthorizations: [
		ID_COLUMN,
		field('connection-source', 'connectionSource'),
		field('date-created', 'dateCreated'),
	],
	orders: [
		ID_COLUMN,
		ERC_COLUMN,
		{
			label: 'status',
			value: (entry) => (entry as InspectedOrder).orderStatusInfo?.label,
		},
		{
			label: 'project',
			value: (entry) =>
				(entry as InspectedOrder).customFields?.projectName,
		},
		{
			label: 'contract',
			value: (entry) =>
				(entry as InspectedOrder).customFields?.contractId,
		},
		hiddenField('order-type', 'orderTypeExternalReferenceCode'),
		{
			hidden: true,
			label: 'items',
			value: (entry) =>
				((entry as InspectedOrder).orderItems ?? [])
					.map(
						({id, skuExternalReferenceCode}) =>
							`${id} ${skuExternalReferenceCode ?? ''}`
					)
					.join(', '),
		},
		hiddenField('date-created', 'createDate'),
	],
	projectMemberships: [
		ID_COLUMN,
		field('user', 'r_userToProjectMembership_userId'),
		projectColumn('projectToProjectMembership'),
		field('role', 'roleExternalReferenceCode'),
	],
	projects: [
		ID_COLUMN,
		ERC_COLUMN,
		field('name', 'name'),
		STATUS_COLUMN,
		hiddenField('date-created', 'dateCreated'),
	],
	properties: [
		ID_COLUMN,
		field('name', 'name'),
		field('value', 'value'),
		field('class-name', 'className'),
	],
	publisherAssets: [ID_COLUMN, ERC_COLUMN, field('version', 'version')],
	publisherDetails: [
		ID_COLUMN,
		field('publisher-name', 'publisherName'),
		field('email', 'email'),
		field('catalog', 'catalogId'),
	],
	publisherSalesSummaries: [
		ID_COLUMN,
		field('quarter', 'quarter'),
		field('payment-status', 'paymentStatus'),
		field('paid-date', 'paidDate'),
	],
	ticketAttachments: [
		ID_COLUMN,
		field('file-name', 'fileName'),
		field('jira-issue-key', 'jiraIssueKey'),
		field('state', 'state'),
	],
	trialExtensionRequests: [
		ID_COLUMN,
		field('project', 'projectId'),
		field('duration', 'duration'),
		field('status', 'dueStatus'),
		hiddenField('reason', 'reason'),
	],
	usageReports: [
		ID_COLUMN,
		field('product', 'productName'),
		projectColumn('projectToUsageReport'),
		field('overage-quantity', 'overageQuantity'),
		field('review-status', 'reviewStatus'),
		{
			...contractColumn('projectToUsageReport'),
			hidden: true,
			value: (entry) => entry.contractExternalReferenceCode,
		},
		hiddenField('date-from', 'dateFrom'),
		hiddenField('date-to', 'dateTo'),
	],
	users: [
		ID_COLUMN,
		field('name', 'name'),
		field('email-address', 'emailAddress'),
		field('status', 'status'),
		{
			label: 'roles',
			value: (entry, accountId) =>
				(entry as InspectedUser).accountBriefs
					?.find(({id}) => id === accountId)
					?.roleBriefs?.map(({name}) => name)
					.join(', '),
		},
	],
};

export const INSPECTED_COLLECTION_LABELS: Record<InspectedCollectionKey, Word> =
	{
		account: 'account',
		accountInvitations: 'account-invitations',
		accountNotes: 'account-notes',
		activationKeys: 'activation-keys',
		contracts: 'contracts',
		entitlements: 'entitlements',
		environments: 'environments',
		licenseKeys: 'license-keys',
		oauth2DxpAuthorizations: 'dxp-connections',
		orders: 'orders',
		projectMemberships: 'project-memberships',
		projects: 'projects',
		properties: 'properties',
		publisherAssets: 'publisher-assets',
		publisherDetails: 'publisher-details',
		publisherSalesSummaries: 'publisher-sales-summaries',
		ticketAttachments: 'ticket-attachments',
		trialExtensionRequests: 'trial-extension-requests',
		usageReports: 'usage-reports',
		users: 'users',
	};
