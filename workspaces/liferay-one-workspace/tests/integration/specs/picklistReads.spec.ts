/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

import {DEFAULT_ADMIN_PASSWORD} from '../../utils/constants';
import {APIHelpers} from '../helpers/APIHelpers';

const ACCOUNT_BUYER_EMAIL = 'buyer@customer.com';

test.describe('[AUTH-PICKLIST-READS] picklist reads', () => {
	test('[AUTH-PICKLIST-READS] a customer reads the entries of the SaaS primary region picklist', async ({
		request,
	}) => {
		const buyer = new APIHelpers(request, {
			basicAuth: {
				password: DEFAULT_ADMIN_PASSWORD,
				user: ACCOUNT_BUYER_EMAIL,
			},
		});

		const {listTypeEntries} = await buyer.get<{
			listTypeEntries: {name: string}[];
		}>(
			'/o/headless-admin-list-type/v1.0/list-type-definitions/by-external-reference-code/LT_ENVIRONMENT_PRIMARY_REGION'
		);

		expect(listTypeEntries.map(({name}) => name)).toContain(
			'North America'
		);
	});
});
