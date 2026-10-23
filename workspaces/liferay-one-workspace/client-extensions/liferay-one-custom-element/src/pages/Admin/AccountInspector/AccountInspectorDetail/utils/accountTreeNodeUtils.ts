/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/i18n';

import {INSPECTED_COLLECTION_LABELS} from './inspectedCollectionConstants';

import type {
	AccountFinding,
	AccountFindingSeverity,
	AccountTreeNode,
	InspectedCollectionKey,
	InspectedEntry,
} from '~/types/accountInspection';

export type SeverityIndex = Map<string, AccountFindingSeverity>;

const SEVERITY_RANK: Record<AccountFindingSeverity, number> = {
	danger: 3,
	info: 1,
	warning: 2,
};

export function toSeverityKey(
	collection: InspectedCollectionKey,
	recordId: number | string
) {
	return `${collection}/${recordId}`;
}

export function getWorstSeverity(
	severities: (AccountFindingSeverity | undefined)[]
): AccountFindingSeverity | undefined {
	return severities.reduce<AccountFindingSeverity | undefined>(
		(worst, severity) =>
			severity &&
			(!worst || SEVERITY_RANK[severity] > SEVERITY_RANK[worst])
				? severity
				: worst,
		undefined
	);
}

export function buildSeverityIndex(findings: AccountFinding[]): SeverityIndex {
	const severityIndex: SeverityIndex = new Map();

	findings.forEach(({collection, ids, severity}) =>
		ids.forEach((id) => {
			const key = toSeverityKey(collection, id);

			severityIndex.set(
				key,
				getWorstSeverity([severityIndex.get(key), severity])!
			);
		})
	);

	return severityIndex;
}

function getRecordLabel(
	collection: InspectedCollectionKey,
	entry: InspectedEntry
) {
	if (collection === 'projectMemberships') {
		return [
			i18n.translate('user'),
			entry.r_userToProjectMembership_userId,
			entry.roleExternalReferenceCode,
		]
			.filter(Boolean)
			.join(' ');
	}

	if (collection === 'contracts' && (entry.startDate || entry.endDate)) {
		return `${entry.externalReferenceCode ?? entry.id} ${String(
			entry.startDate ?? ''
		).slice(0, 10)} - ${String(entry.endDate ?? '').slice(0, 10)}`;
	}

	return String(
		entry.name || entry.emailAddress || entry.externalReferenceCode || ''
	);
}

export function toRecordNode(
	parentKey: string,
	collection: InspectedCollectionKey,
	entry: InspectedEntry,
	severityIndex: SeverityIndex,
	children: AccountTreeNode[] = []
): AccountTreeNode {
	return {
		children,
		collection,
		key: `${parentKey}/${toSeverityKey(collection, entry.id)}`,
		label: getRecordLabel(collection, entry) || `#${entry.id}`,
		meta: `#${entry.id}`,
		recordId: entry.id,
		severity: getWorstSeverity([
			severityIndex.get(toSeverityKey(collection, entry.id)),
			...children.map(({severity}) => severity),
		]),
	};
}

export function toGroupNode(
	parentKey: string,
	collection: InspectedCollectionKey,
	entries: InspectedEntry[],
	severityIndex: SeverityIndex
): AccountTreeNode[] {
	if (!entries.length) {
		return [];
	}

	const groupKey = `${parentKey}/${collection}`;

	const children = entries.map((entry) =>
		toRecordNode(groupKey, collection, entry, severityIndex)
	);

	return [
		{
			children,
			collection,
			count: entries.length,
			key: groupKey,
			label: i18n.translate(INSPECTED_COLLECTION_LABELS[collection]),
			severity: getWorstSeverity(children.map(({severity}) => severity)),
		},
	];
}
