/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {formatInspectedValue} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/inspectorFilterUtils';

import type {InspectedCollectionColumn} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/inspectedCollectionConstants';

export type SortDirection = 'asc' | 'desc';

const NO_ACCOUNT_ID = 0;

function compareValues(value1: unknown, value2: unknown) {
	if (typeof value1 === 'number' && typeof value2 === 'number') {
		return value1 - value2;
	}

	return formatInspectedValue(value1).localeCompare(
		formatInspectedValue(value2),
		undefined,
		{numeric: true, sensitivity: 'base'}
	);
}

function sortInspectorEntries<Entry>(
	entries: Entry[],
	column: InspectedCollectionColumn<Entry>,
	direction: SortDirection
) {
	const sign = direction === 'asc' ? 1 : -1;

	return [...entries].sort(
		(entry1, entry2) =>
			sign *
			compareValues(
				column.value(entry1, NO_ACCOUNT_ID),
				column.value(entry2, NO_ACCOUNT_ID)
			)
	);
}

export default sortInspectorEntries;
