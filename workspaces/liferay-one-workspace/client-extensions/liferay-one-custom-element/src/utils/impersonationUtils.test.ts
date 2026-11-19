/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
	appendDoAsUserId,
	appendDoAsUserIdEncoded,
	isImpersonating,
} from './impersonationUtils';

const {getDoAsUserIdEncoded, getRealUserId, getUserId} = vi.hoisted(() => ({
	getDoAsUserIdEncoded: vi.fn(),
	getRealUserId: vi.fn(),
	getUserId: vi.fn(),
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		ThemeDisplay: {getDoAsUserIdEncoded, getRealUserId, getUserId},
	},
}));

function impersonate() {
	getDoAsUserIdEncoded.mockReturnValue('a1b2c3');
	getRealUserId.mockReturnValue('100');
	getUserId.mockReturnValue('200');
}

describe('[MOD-IMPERSONATIONUTILS] impersonationUtils', () => {
	beforeEach(() => {
		getDoAsUserIdEncoded.mockReturnValue('');
		getRealUserId.mockReturnValue('100');
		getUserId.mockReturnValue('100');
	});

	it('leaves every URL unchanged when the user does not impersonate', () => {
		expect(isImpersonating()).toBe(false);
		expect(appendDoAsUserId('/projects')).toBe('/projects');
		expect(appendDoAsUserIdEncoded('/o/c/projects')).toBe('/o/c/projects');
	});

	it('adds the impersonated user ID to a Spring Boot URL', () => {
		impersonate();

		expect(isImpersonating()).toBe(true);
		expect(appendDoAsUserId('/projects')).toBe('/projects?doAsUserId=200');
		expect(appendDoAsUserId('/projects?page=2')).toBe(
			'/projects?page=2&doAsUserId=200'
		);
	});

	it('adds the encoded user ID to a Liferay URL on the same origin', () => {
		impersonate();

		expect(appendDoAsUserIdEncoded('/o/c/projects')).toBe(
			'/o/c/projects?doAsUserId=a1b2c3'
		);
		expect(
			appendDoAsUserIdEncoded(
				`${window.location.origin}/o/c/projects?x=1`
			)
		).toBe(`${window.location.origin}/o/c/projects?x=1&doAsUserId=a1b2c3`);
	});

	it('does not send the encoded user ID to another origin or twice', () => {
		impersonate();

		expect(appendDoAsUserIdEncoded('https://storage.example.com/a')).toBe(
			'https://storage.example.com/a'
		);
		expect(appendDoAsUserIdEncoded('//storage.example.com/a')).toBe(
			'//storage.example.com/a'
		);
		expect(appendDoAsUserIdEncoded('/o/c/projects?doAsUserId=x')).toBe(
			'/o/c/projects?doAsUserId=x'
		);
	});

	it('adds the user ID before a fragment and beside a similar parameter', () => {
		impersonate();

		expect(appendDoAsUserIdEncoded('/o/c/projects#top')).toBe(
			'/o/c/projects?doAsUserId=a1b2c3#top'
		);
		expect(appendDoAsUserIdEncoded('/o/c/projects?p_p_doAsUserId=x')).toBe(
			'/o/c/projects?p_p_doAsUserId=x&doAsUserId=a1b2c3'
		);
	});
});
