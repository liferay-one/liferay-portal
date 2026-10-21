/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import isDownloadableKey from './isDownloadableKey';

import type {ProjectActivationKey} from '~/hooks/useProjectActivationKeys';

function toActivationKey(activationKey: Partial<ProjectActivationKey>) {
	return {
		active: true,
		status: 'active',
		...activationKey,
	} as ProjectActivationKey;
}

describe('[MOD-MYACCOUNT-PROJECTS-ISDOWNLOADABLEKEY] isDownloadableKey', () => {
	it('is true for an active key', () => {
		expect(isDownloadableKey(toActivationKey({}))).toBe(true);
	});

	it('is true for an active key that starts in the future', () => {
		expect(
			isDownloadableKey(toActivationKey({status: 'not-activated'}))
		).toBe(true);
	});

	it('is false for a deactivated key', () => {
		expect(
			isDownloadableKey(
				toActivationKey({active: false, status: 'not-activated'})
			)
		).toBe(false);
	});

	it('is false for an expired key', () => {
		expect(isDownloadableKey(toActivationKey({status: 'expired'}))).toBe(
			false
		);
	});
});
