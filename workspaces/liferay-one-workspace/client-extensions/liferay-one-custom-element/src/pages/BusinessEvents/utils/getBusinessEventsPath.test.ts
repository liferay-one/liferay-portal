/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {getBusinessEventsPath} from './getBusinessEventsPath';

describe('[MOD-BUSINESSEVENTS-GETBUSINESSEVENTSPATH] getBusinessEventsPath', () => {
	it('builds the business events path of a project in an account', () => {
		expect(getBusinessEventsPath('ACCNT-1', 'PRJCT-1')).toBe(
			'/ACCNT-1/project/PRJCT-1/business-events'
		);
	});

	it('appends the segments after the business events', () => {
		expect(getBusinessEventsPath('ACCNT-1', 'PRJCT-1', 42, 'edit')).toBe(
			'/ACCNT-1/project/PRJCT-1/business-events/42/edit'
		);
	});
});
