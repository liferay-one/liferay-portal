/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import accountSchemas, {MAX_INVITATIONS_COUNT} from './accountSchemas';

const validInvite = {
	emailAddress: 'jane@liferay.com',
	familyName: 'Doe',
	givenName: 'Jane',
	roleNames: ['Account Member'],
};

function parse(invites: unknown[]) {
	return accountSchemas.inviteMembers.safeParse({invites});
}

describe('[MOD-SCHEMAS-ACCOUNTSCHEMAS] accountSchemas', () => {
	it('accepts between 1 and 10 invites', () => {
		expect(parse([validInvite]).success).toBe(true);
		expect(
			parse(
				Array.from({length: MAX_INVITATIONS_COUNT}, (_, index) => ({
					...validInvite,
					emailAddress: `user${index}@liferay.com`,
				}))
			).success
		).toBe(true);
	});

	it('rejects zero invites and more than 10 invites', () => {
		expect(parse([]).success).toBe(false);
		expect(
			parse(
				Array.from({length: MAX_INVITATIONS_COUNT + 1}, (_, index) => ({
					...validInvite,
					emailAddress: `user${index}@liferay.com`,
				}))
			).success
		).toBe(false);
	});

	it('trims the email address and rejects an invalid one', () => {
		const result = parse([
			{...validInvite, emailAddress: '  jane@liferay.com  '},
		]);

		expect(result.success && result.data.invites[0].emailAddress).toBe(
			'jane@liferay.com'
		);
		expect(parse([{...validInvite, emailAddress: 'jane'}]).success).toBe(
			false
		);
		expect(
			parse([{...validInvite, emailAddress: 'jane@liferay'}]).success
		).toBe(false);
	});

	it('rejects first and last names that are empty after trimming', () => {
		expect(parse([{...validInvite, givenName: '   '}]).success).toBe(false);
		expect(parse([{...validInvite, familyName: ''}]).success).toBe(false);
	});

	it('requires a roleNames array', () => {
		expect(parse([{...validInvite, roleNames: []}]).success).toBe(true);
		expect(parse([{...validInvite, roleNames: undefined}]).success).toBe(
			false
		);
	});

	it('flags a case insensitive duplicate email on the later invite', () => {
		const result = parse([
			validInvite,
			{...validInvite, emailAddress: 'other@liferay.com'},
			{...validInvite, emailAddress: 'JANE@Liferay.com'},
		]);

		expect(result.success).toBe(false);

		if (!result.success) {
			expect(result.error.issues).toHaveLength(1);
			expect(result.error.issues[0].path).toEqual([
				'invites',
				2,
				'emailAddress',
			]);
		}
	});
});
