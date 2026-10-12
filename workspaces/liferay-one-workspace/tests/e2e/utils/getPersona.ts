/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	DEFAULT_ADMIN_EMAIL,
	DEFAULT_ADMIN_PASSWORD,
} from '../../utils/constants';

/**
 * One user per role the e2e suite signs in as. The defaults are the users that
 * `scripts/seed` provisions on ACCNT-001 (password `test`). Override any of
 * them with `ONE_<KEY>_EMAIL` and `ONE_<KEY>_PASSWORD` to run against another
 * environment, or set `ONE_PERSONA_PASSWORD` once for every persona.
 *
 * A persona never falls back to the administrator. An administrator session
 * passes every check that expects a denial, so a gated test that silently ran
 * as the administrator would prove nothing.
 */

export type PersonaKey =
	| 'ACCOUNT_ADMIN'
	| 'ACCOUNT_BUYER'
	| 'ACCOUNT_MEMBER'
	| 'ADMINISTRATOR'
	| 'FINANCE_ADMIN'
	| 'LIFERAY_STAFF'
	| 'MULTI_ACCOUNT'
	| 'NULL_PROJECT_MEMBER'
	| 'NULL_ROLE'
	| 'PARTNER_ADMIN'
	| 'PROJECT_ADMIN'
	| 'PROJECT_REQUESTER'
	| 'PROJECT_USER'
	| 'PROVISIONING_ADMIN'
	| 'PUBLISHER'
	| 'SSA_USER';

export type Persona = {
	email: string;
	key: PersonaKey;
	label: string;
	password: string;
};

const PERSONAS: Record<PersonaKey, {email: string; label: string}> = {
	ACCOUNT_ADMIN: {email: 'admin@customer.com', label: 'Account Admin'},
	ACCOUNT_BUYER: {email: 'buyer@customer.com', label: 'Account Buyer'},
	ACCOUNT_MEMBER: {
		email: 'accountmember@customer.com',
		label: 'Account Member',
	},
	ADMINISTRATOR: {email: DEFAULT_ADMIN_EMAIL, label: 'Administrator'},
	FINANCE_ADMIN: {
		email: 'finance@liferay.com',
		label: 'Finance Administrator',
	},
	LIFERAY_STAFF: {email: 'staff@liferay.com', label: 'Liferay Staff'},
	MULTI_ACCOUNT: {
		email: 'member@customer.com',
		label: 'Member of many accounts',
	},
	NULL_PROJECT_MEMBER: {
		email: 'norole-project@customer.com',
		label: 'No Role (null), project member',
	},
	NULL_ROLE: {email: 'norole@customer.com', label: 'No Role (null)'},
	PARTNER_ADMIN: {
		email: 'partneradmin@partner.com',
		label: 'Partner Account Admin',
	},
	PROJECT_ADMIN: {email: 'projectadmin@customer.com', label: 'Project Admin'},
	PROJECT_REQUESTER: {
		email: 'requester@customer.com',
		label: 'Project Requester',
	},
	PROJECT_USER: {email: 'accountmember@customer.com', label: 'Project User'},
	PROVISIONING_ADMIN: {
		email: 'provisioning@liferay.com',
		label: 'Provisioning Administrator',
	},
	PUBLISHER: {email: 'admin@publisher.com', label: 'Marketplace Publisher'},
	SSA_USER: {email: 'ssa@liferay.com', label: 'SSA User'},
};

export default function getPersona(key: PersonaKey): Persona {
	const {email, label} = PERSONAS[key];

	if (key === 'ADMINISTRATOR') {
		return {
			email,
			key,
			label,
			password: DEFAULT_ADMIN_PASSWORD,
		};
	}

	return {
		email: process.env[`ONE_${key}_EMAIL`]?.trim() || email,
		key,
		label,
		password:
			process.env[`ONE_${key}_PASSWORD`]?.trim() ||
			process.env.ONE_PERSONA_PASSWORD?.trim() ||
			'test',
	};
}
