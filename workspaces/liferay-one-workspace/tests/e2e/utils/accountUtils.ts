/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page, expect} from '@playwright/test';

import {ACCOUNT_ERC, sitePath} from './environmentUtils';

type LiferayWindow = {
	Liferay: {
		CommerceContext?: {account?: {accountId?: number | string}};
		ThemeDisplay: {getScopeGroupId: () => string};
		authToken: string;
	};
};

export function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function readCurrentAccountId(page: Page): Promise<string> {
	return page
		.evaluate(() => {
			const {Liferay} = window as unknown as LiferayWindow;

			return String(Liferay?.CommerceContext?.account?.accountId);
		})
		.catch(() => '');
}

async function readSelectedProjectName(
	selector: ReturnType<Page['getByRole']>,
	projectName: string
): Promise<boolean> {
	const lines = (await selector.innerText().catch(() => ''))
		.split('\n')
		.map((line) => line.trim());

	return lines.includes(projectName);
}

export async function selectCurrentAccount(
	page: Page,
	accountExternalReferenceCode: string = ACCOUNT_ERC
): Promise<void> {
	await page.goto(sitePath('/home'));

	const result = await page.evaluate(async (externalReferenceCode) => {
		const {Liferay} = window as unknown as LiferayWindow;

		const accountResponse = await fetch(
			`/o/headless-admin-user/v1.0/accounts/by-external-reference-code/${encodeURIComponent(externalReferenceCode)}`,
			{headers: {'x-csrf-token': Liferay.authToken}}
		);

		if (!accountResponse.ok) {
			return {accountId: '', status: accountResponse.status};
		}

		const {id} = (await accountResponse.json()) as {id: number};

		const body = new FormData();

		body.append('accountId', String(id));

		const response = await fetch(
			`/o/commerce-ui/set-current-account?groupId=${Liferay.ThemeDisplay.getScopeGroupId()}&p_auth=${Liferay.authToken}`,
			{
				body,
				headers: {'x-csrf-token': Liferay.authToken},
				method: 'POST',
			}
		);

		return {accountId: String(id), status: response.status};
	}, accountExternalReferenceCode);

	expect(
		result.status,
		`expected ${accountExternalReferenceCode} to become the current account`
	).toBe(200);

	await expect
		.poll(
			async () => {
				await page.reload();

				return readCurrentAccountId(page);
			},
			{
				message: `expected ${accountExternalReferenceCode} to become the current account`,
				timeout: 30000,
			}
		)
		.toBe(result.accountId);
}

export async function selectProject(
	page: Page,
	projectName: string
): Promise<void> {
	const selector = page.getByRole('button', {name: 'Select Project'});

	await expect(
		selector.or(page.getByText(projectName, {exact: true})).first(),
		'expected the project selector to render'
	).toBeVisible();

	const isReadOnly = !(await selector.count());

	if (isReadOnly || (await readSelectedProjectName(selector, projectName))) {
		return;
	}

	await selector.click();

	await page
		.getByRole('menuitem', {
			name: new RegExp(`^${escapeRegExp(projectName)}(\\s|$)`),
		})
		.click();

	await expect
		.poll(() => readSelectedProjectName(selector, projectName), {
			message: `expected ${projectName} to become the selected project`,
		})
		.toBe(true);
}
