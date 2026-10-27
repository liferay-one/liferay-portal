/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import isSalesforceAccountId from './isSalesforceAccountId';

describe('[MOD-ADMIN-ACCOUNTINSPECTOR-ACCOUNTINSPECTORDETAIL-ISSALESFORCEACCOUNTID] isSalesforceAccountId', () => {
	it('accepts a 15 or 18 character Salesforce account ID', () => {
		expect(isSalesforceAccountId('0015g00000ABCDE')).toBe(true);
		expect(isSalesforceAccountId('0015g00000ABCDEAAA')).toBe(true);
	});

	it('rejects an ERC that is not a Salesforce account ID', () => {
		expect(isSalesforceAccountId(undefined)).toBe(false);
		expect(isSalesforceAccountId('')).toBe(false);
		expect(isSalesforceAccountId('ACCNT-001')).toBe(false);
		expect(isSalesforceAccountId('0065g00000ABCDE')).toBe(false);
		expect(isSalesforceAccountId('0015g00000ABCD')).toBe(false);
		expect(isSalesforceAccountId("0015g00000ABC'E")).toBe(false);
	});
});
