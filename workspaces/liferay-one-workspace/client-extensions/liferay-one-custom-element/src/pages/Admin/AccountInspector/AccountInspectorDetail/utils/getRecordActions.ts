/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {getAccountDashboardURL} from './accountDashboardUtils';

import type {Word} from '~/i18n';
import type {
	InspectedCollectionKey,
	InspectedEntry,
} from '~/types/accountInspection';
import type {Account} from '~/types/accounts';

export type RecordAction =
	| {copyText: string; label: Word}
	| {href: string; label: Word; newTab?: boolean};

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

const GET_ACTION_KEYS = ['get', 'get-user-account'];

function getAPIURL(entry: InspectedEntry) {
	const actions = entry.actions as
		| Record<string, {href?: string}>
		| undefined;

	const href = GET_ACTION_KEYS.map((key) => actions?.[key]?.href).find(
		Boolean
	);

	if (!href) {
		return undefined;
	}

	const url = new URL(
		href.replace('{id}', String(entry.id)),
		window.location.origin
	);

	return ALLOWED_PROTOCOLS.includes(url.protocol) ? url.href : undefined;
}

function getDashboardAction(
	account: Account,
	collection: InspectedCollectionKey,
	entry: InspectedEntry
): RecordAction | null {
	const toAction = (label: Word, path: string) => ({
		href: getAccountDashboardURL(account, path),
		label,
	});

	const projectERC = (relationshipName: string) =>
		entry[`r_${relationshipName}_c_projectERC`] as string | undefined;

	switch (collection) {
		case 'contracts': {
			const projectExternalReferenceCode =
				projectERC('projectToContract');

			return projectExternalReferenceCode
				? toAction(
						'open-contract',
						`project/${projectExternalReferenceCode}/contract/${entry.externalReferenceCode}/products`
					)
				: null;
		}
		case 'licenseKeys': {
			const projectExternalReferenceCode = projectERC(
				'projectToLicenseKey'
			);

			return projectExternalReferenceCode
				? toAction(
						'open-license-key',
						`project/${projectExternalReferenceCode}/activation/${entry.externalReferenceCode}`
					)
				: null;
		}
		case 'orderItems':
			return toAction('open-order', `orders/${entry.orderId}`);
		case 'orders':
			return toAction('open-order', `orders/${entry.id}`);
		case 'projectMemberships':
			return toAction('open-project-members', 'project-members');
		case 'projects':
			return toAction(
				'open-project',
				`project/${entry.externalReferenceCode}`
			);
		case 'users':
			return toAction('open-account-members', 'account-members');
		default:
			return null;
	}
}

function getRecordActions(
	account: Account,
	collection: InspectedCollectionKey,
	entry: InspectedEntry
): RecordAction[] {
	const apiURL = getAPIURL(entry);
	const dashboardAction = getDashboardAction(account, collection, entry);

	return [
		...(dashboardAction ? [dashboardAction] : []),
		...(apiURL
			? [{href: apiURL, label: 'open-api-response' as Word, newTab: true}]
			: []),
		{copyText: String(entry.id), label: 'copy-id'},
		...(entry.externalReferenceCode
			? [
					{
						copyText: entry.externalReferenceCode,
						label: 'copy-external-reference-code' as Word,
					},
				]
			: []),
	];
}

export default getRecordActions;
