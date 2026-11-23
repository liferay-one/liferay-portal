/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	getAIHubEnvironmentExternalReferenceCode,
	isProvisionedAIHubEnvironment,
} from './aiHubEnvironmentUtils';

describe('[MOD-AIHUBENVIRONMENTUTILS] aiHubEnvironmentUtils', () => {
	it('keys the AI Hub environment by its project or account', () => {
		expect(getAIHubEnvironmentExternalReferenceCode('PRJCT-1')).toBe(
			'AI-HUB-PRJCT-1'
		);
	});

	it('counts an environment as provisioned only with a positive external environment ID', () => {
		expect(
			isProvisionedAIHubEnvironment({externalEnvironmentId: '444'})
		).toBe(true);
		expect(isProvisionedAIHubEnvironment({externalEnvironmentId: ''})).toBe(
			false
		);
		expect(
			isProvisionedAIHubEnvironment({externalEnvironmentId: '0'})
		).toBe(false);
		expect(isProvisionedAIHubEnvironment({})).toBe(false);
		expect(isProvisionedAIHubEnvironment()).toBe(false);
	});
});
