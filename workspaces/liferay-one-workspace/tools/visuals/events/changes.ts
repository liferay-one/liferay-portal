/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * The items of the events visual that a comparison marks: every handler,
 * whether an object action, a scheduled job, or a Pub/Sub subscriber. The
 * handler ID names its kind, its object or class, and its name, and no line,
 * so it names the same handler at both refs. The comparison leaves out the
 * line of its location.
 */

import type {IChangeItem} from '../lib.ts';

export function changeItems(data: any): IChangeItem[] {
	return data.handlers.map(({id, ...handler}: any) => ({
		key: `handler:${id}`,
		kind: 'handlers',
		label: handler.objectLabel
			? `${handler.objectLabel} · ${handler.name}`
			: handler.name,
		value: handler,
	}));
}
