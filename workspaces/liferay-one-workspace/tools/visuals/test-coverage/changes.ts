/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Lists the items of the test coverage visual that a comparison can mark:
 * each requirement and each plan item, keyed by its ID. The value holds the
 * coverage only, so a requirement that gains or loses a real test, or a plan
 * item whose tests or status change, is changed, and an edit to the wording
 * of either is not.
 */

import type {IChangeItem} from '../lib.ts';

export function changeItems(data: any): IChangeItem[] {
	return [
		...data.requirements.map((requirement: any) => ({
			key: `requirement:${requirement.id}`,
			kind: 'requirements',
			label: requirement.id,
			value: {
				klass: requirement.klass,
				priority: requirement.priority,
				real: requirement.real,
				verifiedBy: requirement.verifiedBy,
			},
		})),
		...data.items.map((item: any) => ({
			key: `test:${item.id}`,
			kind: 'plan items',
			label: item.id,
			value: {
				klass: item.klass,
				priority: item.priority,
				requirements: item.requirements,
				status: item.status,
				tests: item.tests,
				tier: item.tier,
			},
		})),
	];
}
