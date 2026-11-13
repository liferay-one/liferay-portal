/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect} from '@playwright/test';

import {apiTest as test} from '../fixtures/apiTest';

const parentObjectDefinitions = [
	{externalReferenceCode: 'C_ACTIVATION_KEY', titleObjectFieldName: 'id'},
	{
		externalReferenceCode: 'L_COMMERCE_ORDER_ITEM',
		titleObjectFieldName: 'id',
	},
	{
		externalReferenceCode: 'L_COMMERCE_PRODUCT_DEFINITION',
		titleObjectFieldName: 'name',
	},
	{externalReferenceCode: 'L_ORGANIZATION', titleObjectFieldName: 'name'},
	{externalReferenceCode: 'L_POSTAL_ADDRESS', titleObjectFieldName: 'name'},
	{externalReferenceCode: 'L_USER', titleObjectFieldName: 'emailAddress'},
] as const;

const searchPaths = [
	'/o/c/entitlements',
	'/o/c/licensekeys',
	'/o/c/productfeedbacks',
	'/o/c/projectmemberships',
	'/o/c/projects',
	'/o/c/publisherassets',
] as const;

test.describe('[FLOW-OBJECT-ENTRY-SEARCH] object entry search', () => {
	for (const {
		externalReferenceCode,
		titleObjectFieldName,
	} of parentObjectDefinitions) {
		test(`[FLOW-OBJECT-ENTRY-SEARCH] ${externalReferenceCode} has the ${titleObjectFieldName} title field`, async ({
			api,
		}) => {
			const objectDefinition = await api.get<{
				titleObjectFieldName: string;
			}>(
				`/o/object-admin/v1.0/object-definitions/by-external-reference-code/${externalReferenceCode}`
			);

			expect(objectDefinition.titleObjectFieldName).toBe(
				titleObjectFieldName
			);
		});
	}

	for (const path of searchPaths) {
		test(`[FLOW-OBJECT-ENTRY-SEARCH] a keyword search on ${path} succeeds`, async ({
			api,
		}) => {
			const response = await api.send(
				'get',
				`${path}?pageSize=1&search=gold`
			);

			expect(response.status(), await response.text()).toBe(200);
		});
	}
});
