/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

const springBootBaseURL =
	process.env.SPRING_BOOT_BASE_URL ?? 'http://localhost:58081';

test.describe('liferay-one-etc-spring-boot /ready', () => {
	test('[REST-GET-READY] reports READY when the client extension is healthy', async ({
		request,
	}) => {
		const response = await request.get(`${springBootBaseURL}/ready`);

		expect(response.ok(), await response.text()).toBeTruthy();
		expect(await response.text()).toBe('READY');
	});
});
