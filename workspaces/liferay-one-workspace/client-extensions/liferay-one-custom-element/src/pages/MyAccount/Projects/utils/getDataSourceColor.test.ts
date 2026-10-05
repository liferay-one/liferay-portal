/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getDataSourceColor from './getDataSourceColor';

describe('[MOD-MYACCOUNT-PROJECTS-GETDATASOURCECOLOR] getDataSourceColor', () => {
	it('returns the same color for the same data source ID', () => {
		expect(getDataSourceColor('data-source-1')).toBe(
			getDataSourceColor('data-source-1')
		);
	});

	it('uses the golden angle hue and cycles through three lightness levels', () => {
		expect(getDataSourceColor('')).toBe('hsl(0 70% 42%)');
		expect(getDataSourceColor('\u0001')).toBe('hsl(137.508 70% 55%)');
		expect(getDataSourceColor('\u0002')).toBe('hsl(275.016 70% 68%)');
		expect(getDataSourceColor('\u0003')).toMatch(
			/^hsl\(52\.52\d* 70% 42%\)$/
		);
	});

	it.each([
		['a', 18.276, 55],
		['analytics', 191.1, 68],
		['data-source-1', 128.76, 55],
		['zzzz', 146.4, 55],
	])(
		'wraps the hue below 360 for %s',
		(dataSourceId, expectedHue, expectedLightness) => {
			const [, hue, lightness] =
				/^hsl\(([\d.]+) 70% (\d+)%\)$/.exec(
					getDataSourceColor(dataSourceId)
				) ?? [];

			expect(Number(hue)).toBeCloseTo(expectedHue, 6);
			expect(Number(lightness)).toBe(expectedLightness);
		}
	);
});
