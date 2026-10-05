/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getKebabCase from './getKebabCase';

describe('[MOD-GETKEBABCASE] getKebabCase', () => {
	it('splits camel case, acronyms, and digits into lowercase dash words', () => {
		expect(getKebabCase('helloWorld')).toBe('hello-world');
		expect(getKebabCase('XMLHttpRequest')).toBe('xml-http-request');
		expect(getKebabCase('US East 1')).toBe('us-east-1');
	});

	it('passes through an empty string', () => {
		expect(getKebabCase('')).toBe('');
	});

	it('returns undefined when no tokens match', () => {
		expect(getKebabCase('---')).toBeUndefined();
	});
});
