/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import isRenewableKey from './isRenewableKey';

import type {ProjectActivationKey} from '~/hooks/useProjectActivationKeys';

function toActivationKey(activationKey: Partial<ProjectActivationKey>) {
	return {
		expirationDateValue: '2027-01-01',
		startDateValue: '2026-01-01',
		type: 'production',
		...activationKey,
	} as ProjectActivationKey;
}

describe('[MOD-MYACCOUNT-PROJECTS-ISRENEWABLEKEY] isRenewableKey', () => {
	it('is true for an aggregated, expiring, non virtual cluster key', () => {
		expect(isRenewableKey(toActivationKey({}))).toBe(true);
	});

	it('is false for an unaggregated key', () => {
		expect(isRenewableKey(toActivationKey({unaggregated: true}))).toBe(
			false
		);
		expect(
			isRenewableKey(toActivationKey({unaggregated: true}), true)
		).toBe(false);
	});

	it('is false for a virtual cluster key unless the viewer is an admin', () => {
		const activationKey = toActivationKey({type: 'virtual-cluster'});

		expect(isRenewableKey(activationKey)).toBe(false);
		expect(isRenewableKey(activationKey, true)).toBe(true);
	});

	it('is false for a permanent key', () => {
		const activationKey = toActivationKey({
			expirationDateValue: '2106-01-01',
		});

		expect(isRenewableKey(activationKey)).toBe(false);
		expect(isRenewableKey(activationKey, true)).toBe(false);
	});
});
