/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {Word} from '~/i18n';
import type {Account, AccountPostalAddresses} from '~/types/accounts';

export type InspectedEntry = {
	dateCreated?: string;
	dateModified?: string;
	externalReferenceCode?: string;
	id: number;
	[key: string]: unknown;
};

export type InspectedCollection<Entry = InspectedEntry> = {
	error?: string;
	items: Entry[];
	totalCount: number;
	truncated?: boolean;
};

type InspectedOrderItem = InspectedEntry & {
	name?: Record<string, string>;
	quantity?: number;
	sku?: string;
	skuExternalReferenceCode?: string;
};

export type InspectedOrder = InspectedEntry & {
	createDate?: string;
	customFields?: Record<string, unknown>;
	orderItems?: InspectedOrderItem[];
	orderStatus?: number;
	orderStatusInfo?: {label?: string};
	orderTypeExternalReferenceCode?: string;
};

export type InspectedUser = InspectedEntry & {
	accountBriefs?: {
		id: number;
		roleBriefs?: {externalReferenceCode?: string; name: string}[];
	}[];
	emailAddress?: string;
	name?: string;
	status?: string;
};

export const RELATED_COLLECTION_KEYS = [
	'accountInvitations',
	'accountNotes',
	'activationKeys',
	'contracts',
	'entitlements',
	'environments',
	'licenseKeys',
	'oauth2DxpAuthorizations',
	'projectMemberships',
	'projects',
	'properties',
	'publisherAssets',
	'publisherDetails',
	'publisherSalesSummaries',
	'ticketAttachments',
	'trialExtensionRequests',
	'usageReports',
] as const;

export type RelatedCollectionKey = (typeof RELATED_COLLECTION_KEYS)[number];

export type InspectedCollectionKey =
	| 'account'
	| 'orders'
	| 'users'
	| RelatedCollectionKey;

export type AccountInspection = {
	account: Account;
	loadedAt: number;
	orders: InspectedCollection<InspectedOrder>;
	postalAddresses: InspectedCollection<AccountPostalAddresses>;
	related: Record<RelatedCollectionKey, InspectedCollection>;
	users: InspectedCollection<InspectedUser>;
};

export type AccountFindingSeverity = 'danger' | 'info' | 'warning';

export type AccountFinding = {
	collection: InspectedCollectionKey;
	ids: (number | string)[];
	message: Word;
	severity: AccountFindingSeverity;
};

export type AccountTreeNode = {
	children: AccountTreeNode[];
	collection?: InspectedCollectionKey;
	count?: number;
	key: string;
	label: string;
	meta?: string;
	recordId?: number;
	severity?: AccountFindingSeverity;
};

export type AccountInspectorFocus = {
	collection: InspectedCollectionKey;
	recordId?: number;
	request: number;
};
