/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {toRelativeURL} from './toRelativeURL';

describe('[MOD-TORELATIVEURL] toRelativeURL', () => {
	it('drops the internal host and scheme from an absolute image URL', () => {
		expect(
			toRelativeURL(
				'http://one-uat.liferay.net/o/commerce-media/accounts/-1/images/39238285?download=true'
			)
		).toBe('/o/commerce-media/accounts/-1/images/39238285?download=true');
	});

	it('keeps a relative URL as it is', () => {
		expect(toRelativeURL('/documents/d/guest/image.png')).toBe(
			'/documents/d/guest/image.png'
		);
	});

	it('returns an empty string when there is no URL', () => {
		expect(toRelativeURL(undefined)).toBe('');
	});
});
