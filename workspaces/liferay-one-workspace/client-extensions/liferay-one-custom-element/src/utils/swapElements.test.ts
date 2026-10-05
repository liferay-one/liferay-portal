/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import swapElements from './swapElements';

describe('[MOD-SWAPELEMENTS] swapElements', () => {
	it('returns a new array with the two indexes exchanged', () => {
		expect(swapElements(['a', 'b', 'c'], 0, 2)).toEqual(['c', 'b', 'a']);
	});

	it('leaves the input array unchanged', () => {
		const input = [1, 2, 3];

		const swapped = swapElements(input, 1, 2);

		expect(input).toEqual([1, 2, 3]);
		expect(swapped).not.toBe(input);
		expect(swapped).toEqual([1, 3, 2]);
	});
});
