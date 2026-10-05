/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getKeyType from './getKeyType';

describe('[MOD-MYACCOUNT-PROJECTS-GETKEYTYPE] getKeyType', () => {
	it('maps virtual cluster to virtual cluster', () => {
		expect(getKeyType('virtual-cluster')).toBe('virtual-cluster');
	});

	it('maps cluster and developer cluster to cluster', () => {
		expect(getKeyType('cluster')).toBe('cluster');
		expect(getKeyType('developer-cluster')).toBe('cluster');
	});

	it('maps everything else to on premise', () => {
		expect(getKeyType('production')).toBe('on-premise');
		expect(getKeyType(undefined)).toBe('on-premise');
	});
});
