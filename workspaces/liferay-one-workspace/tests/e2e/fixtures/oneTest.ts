/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, request as playwrightRequest, test} from '@playwright/test';

import HeadlessAPI from '../utils/HeadlessAPI';
import SpringBootStub from '../utils/SpringBootStub';
import getPersona, {Persona, PersonaKey} from '../utils/getPersona';
import {liferayLogin} from '../utils/loginUtils';

export const oneTest = test.extend<{
	adminAPI: HeadlessAPI;
	signIn: (key: PersonaKey) => Promise<Persona>;
	springBoot: SpringBootStub;
}>({
	adminAPI: async ({baseURL}, use) => {
		const context = await playwrightRequest.newContext({baseURL});

		await use(new HeadlessAPI(context));

		await context.dispose();
	},
	signIn: async ({page}, use) => {
		await use(async (key) => {
			const persona = getPersona(key);

			await liferayLogin(page, persona.email, persona.password);

			return persona;
		});
	},
	springBoot: async ({page}, use) => {
		await use(new SpringBootStub(page));
	},
});

export {expect};
