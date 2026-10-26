/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {RELATED_COLLECTION_KEYS} from '~/types/accountInspection';

import type {Word} from '~/i18n';
import type {
	AccountFinding,
	AccountFindingSeverity,
	AccountInspection,
	InspectedCollection,
	InspectedCollectionKey,
	InspectedEntry,
	InspectedOrder,
} from '~/types/accountInspection';

export function toNumber(value: unknown) {
	return Number(value) || 0;
}

export function toFinding(
	collection: InspectedCollectionKey,
	ids: AccountFinding['ids'],
	message: Word,
	severity: AccountFindingSeverity
): AccountFinding[] {
	return ids.length ? [{collection, ids, message, severity}] : [];
}

export function getIds<Entry extends InspectedEntry>(
	entries: Entry[],
	predicate: (entry: Entry) => boolean
) {
	return entries.filter(predicate).map(({id}) => id);
}

export function isComplete(collection: InspectedCollection<unknown>) {
	return !collection.error && !collection.truncated;
}

export function getLoadedIds(collection: InspectedCollection<InspectedEntry>) {
	return isComplete(collection)
		? new Set(collection.items.map(({id}) => id))
		: null;
}

export function getInspectedCollections({
	orders,
	related,
	users,
}: AccountInspection): [InspectedCollectionKey, InspectedCollection][] {
	return [
		['orders', orders],
		['users', users],
		...RELATED_COLLECTION_KEYS.map(
			(key) =>
				[key, related[key]] as [
					InspectedCollectionKey,
					InspectedCollection,
				]
		),
	];
}

export function getOutsideReferenceIds(
	entries: InspectedEntry[],
	fieldName: string,
	knownIds: Set<number> | null
) {
	if (!knownIds) {
		return [];
	}

	return getIds(entries, (entry) => {
		const referencedId = toNumber(entry[fieldName]);

		return referencedId !== 0 && !knownIds.has(referencedId);
	});
}

export function endsBeforeStart(entry: InspectedEntry) {
	if (!entry.endDate || !entry.startDate) {
		return false;
	}

	return (
		new Date(String(entry.endDate)).getTime() <
		new Date(String(entry.startDate)).getTime()
	);
}

export function getOrderItems(orders: InspectedOrder[]) {
	return orders.flatMap(({orderItems}) => orderItems ?? []);
}
