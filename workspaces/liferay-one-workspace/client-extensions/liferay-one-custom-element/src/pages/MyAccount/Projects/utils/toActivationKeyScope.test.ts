/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {ONE_TIME_PURCHASES} from './constants';
import toActivationKeyScope from './toActivationKeyScope';

describe('[MOD-MYACCOUNT-PROJECTS-TOACTIVATIONKEYSCOPE] toActivationKeyScope', () => {
	it('scopes a project by its external reference code', () => {
		expect(toActivationKeyScope('ACCNT-1', 'PRJCT-1')).toEqual({
			projectExternalReferenceCode: 'PRJCT-1',
		});
	});

	it('scopes the one time purchases by the account', () => {
		expect(toActivationKeyScope('ACCNT-1', ONE_TIME_PURCHASES)).toEqual({
			accountExternalReferenceCode: 'ACCNT-1',
		});
	});

	it('has no scope without a project or, for one time purchases, an account', () => {
		expect(toActivationKeyScope('ACCNT-1', '')).toBeUndefined();
		expect(
			toActivationKeyScope(undefined, ONE_TIME_PURCHASES)
		).toBeUndefined();
	});
});
