/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * The records and the backend mode the e2e suite runs against. Every default
 * points at the local seed (`scripts/seed`), and every value can be overridden
 * from `.env` so the same specs run against UAT.
 *
 * `ONE_E2E_BACKEND` selects how the Spring Boot client extension's external
 * systems (Jira, Google Cloud Storage, Liferay Cloud Console, PayPal) are
 * reached. `stub` (the default) answers those calls in the browser with
 * Playwright route handlers, because a local environment has no credentials
 * for them. `live` installs no stubs, so the calls reach the real systems.
 */

function value(name: string, defaultValue: string): string {
	return process.env[name]?.trim() || defaultValue;
}

export const ACCOUNT_ERC = value('ONE_ACCOUNT_ERC', 'ACCNT-001');

export const BACKEND =
	value('ONE_E2E_BACKEND', 'stub') === 'live' ? 'live' : 'stub';

export const IS_STUBBED = BACKEND === 'stub';

export const PROJECT_ERC = value('ONE_PROJECT_ERC', 'PRJCT-001');

export const PROJECT_NAME = value('ONE_PROJECT_NAME', 'Omni Project');

export const PUBLISHER_ACCOUNT_ERC = value(
	'ONE_PUBLISHER_ACCOUNT_ERC',
	'ACCNT-021'
);

export const SITE_PATH = value('ONE_SITE_PATH', '/web/one');

export const SPRING_BOOT_BASE_URL = value(
	'SPRING_BOOT_BASE_URL',
	'http://localhost:58081'
).replace(/\/$/, '');

export const SSA_ACCOUNT_ERC = value('ONE_SSA_ACCOUNT_ERC', 'SSA-ACCOUNT');

export const SSA_TRIAL_PRODUCT_ERC = value(
	'ONE_SSA_TRIAL_PRODUCT_ERC',
	'PRDCT-SSA-TRIAL'
);

export const SWITCH_ACCOUNT_ERC = value('ONE_SWITCH_ACCOUNT_ERC', 'ACCNT-002');

export const UNASSIGNED_PROJECT_ERC = value(
	'ONE_UNASSIGNED_PROJECT_ERC',
	'PRJCT-001-2'
);

export const UNASSIGNED_PROJECT_NAME = value(
	'ONE_UNASSIGNED_PROJECT_NAME',
	'Omni Project 2'
);

export function sitePath(path: string): string {
	return `${SITE_PATH}${path}`;
}

/**
 * Returns a name no other run produces, so a record a test creates never
 * collides with seed data or with a parallel worker, and cleanup can find it.
 */

export function uniqueName(prefix: string): string {
	return `${prefix} E2E ${Date.now().toString(36)}${Math.random()
		.toString(36)
		.slice(2, 6)}`;
}
