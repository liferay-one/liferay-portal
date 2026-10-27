/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {
	SalesforceEntry,
	SalesforceRecord,
} from '~/types/accountInspection';

const FNV_OFFSET_BASIS = 2166136261;

const FNV_PRIME = 16777619;

function toEntryId({externalReferenceCode, type}: SalesforceRecord) {
	let hash = FNV_OFFSET_BASIS;

	for (const character of `${type}:${externalReferenceCode}`) {
		hash = Math.imul(hash ^ character.charCodeAt(0), FNV_PRIME);
	}

	return hash >>> 0;
}

export default function getSalesforceEntries(
	records: SalesforceRecord[]
): SalesforceEntry[] {
	return records.map((record) => ({...record, id: toEntryId(record)}));
}
