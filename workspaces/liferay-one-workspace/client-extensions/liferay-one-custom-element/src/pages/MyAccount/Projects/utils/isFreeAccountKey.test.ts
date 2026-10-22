/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import isFreeAccountKey from './isFreeAccountKey';

import type {ProjectActivationKey} from '~/hooks/useProjectActivationKeys';

function toActivationKey(activationKey: Partial<ProjectActivationKey>) {
	return {
		type: 'free',
		...activationKey,
	} as ProjectActivationKey;
}

describe('[MOD-MYACCOUNT-PROJECTS-ISFREEACCOUNTKEY] isFreeAccountKey', () => {
	it('is true for a free key with no project', () => {
		expect(isFreeAccountKey(toActivationKey({}))).toBe(true);
	});

	it('is false for a free key of a project', () => {
		expect(
			isFreeAccountKey(
				toActivationKey({projectExternalReferenceCode: 'PRJCT-001'})
			)
		).toBe(false);
	});

	it('is false for a key of another type', () => {
		expect(isFreeAccountKey(toActivationKey({type: 'production'}))).toBe(
			false
		);
	});

	it('is false for an unaggregated license key', () => {
		expect(isFreeAccountKey(toActivationKey({unaggregated: true}))).toBe(
			false
		);
	});
});
