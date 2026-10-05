/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

import {
	getRandomID,
	normalizeURLProtocol,
	removeHTMLTags,
	removeUnnecessaryURLString,
	sanitizeStringForURL,
	toAlphanumericLowerCase,
} from './stringUtils';

describe('[MOD-STRINGUTILS] stringUtils', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('normalizeURLProtocol downgrades https to http when the page is not https', () => {
		expect(window.location.href.startsWith('https')).toBe(false);
		expect(normalizeURLProtocol('https://cdn.example.com/a.png')).toBe(
			'http://cdn.example.com/a.png'
		);
		expect(normalizeURLProtocol()).toBe('');
	});

	it('normalizeURLProtocol keeps https when the page is https', () => {
		vi.spyOn(String.prototype, 'startsWith').mockImplementation(function (
			this: string,
			searchString: string
		) {
			return this === window.location.href && searchString === 'https'
				? true
				: this.indexOf(searchString) === 0;
		});

		expect(normalizeURLProtocol('https://cdn.example.com/a.png')).toBe(
			'https://cdn.example.com/a.png'
		);
	});

	it('removeHTMLTags strips tags', () => {
		expect(removeHTMLTags('<p>Hello <b>world</b></p><br/>')).toBe(
			'Hello world'
		);
		expect(removeHTMLTags('plain')).toBe('plain');
	});

	it('getRandomID returns a UUID from crypto', () => {
		vi.spyOn(crypto, 'randomUUID').mockReturnValue(
			'11111111-2222-3333-4444-555555555555'
		);

		expect(getRandomID()).toBe('11111111-2222-3333-4444-555555555555');
	});

	it('getRandomID falls back when crypto fails', () => {
		vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
			throw new Error('insecure context');
		});
		vi.spyOn(Math, 'random').mockReturnValue(0.5);

		expect(getRandomID()).toBe('liferay-0-5');
	});

	it('removeUnnecessaryURLString cuts before the first /o', () => {
		expect(
			removeUnnecessaryURLString(
				'https://portal.example.com/o/headless-delivery/v1.0/x'
			)
		).toBe('/o/headless-delivery/v1.0/x');
	});

	it('sanitizeStringForURL lowercases, strips symbols, and collapses dashes', () => {
		expect(sanitizeStringForURL('  Hello, World -- App!  ')).toBe(
			'hello-world-app'
		);
		expect(sanitizeStringForURL('-Leading and trailing-')).toBe(
			'leading-and-trailing'
		);
	});

	it('toAlphanumericLowerCase strips symbols and lowercases', () => {
		expect(toAlphanumericLowerCase('My-Project_01!')).toBe('myproject01');
	});
});
