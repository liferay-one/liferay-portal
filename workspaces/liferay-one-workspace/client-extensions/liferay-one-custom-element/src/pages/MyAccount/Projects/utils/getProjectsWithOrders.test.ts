/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {getProjectsWithOrders} from './getProjectsWithOrders';

const alpha = {externalReferenceCode: 'PRJCT-ALPHA', id: 1, name: 'Alpha'};
const beta = {externalReferenceCode: 'PRJCT-BETA', id: 2, name: 'Beta'};
const gamma = {externalReferenceCode: 'PRJCT-GAMMA', id: 3, name: 'Gamma'};

function order(customFields: {[key: string]: string}) {
	return {customFields};
}

describe('[MOD-MYACCOUNT-PROJECTS-GETPROJECTSWITHORDERS] getProjectsWithOrders', () => {
	it('keeps only the projects that have a placed order', () => {
		expect(
			getProjectsWithOrders(
				[alpha, beta, gamma],
				[order({projectName: 'Alpha'}), order({projectName: 'Gamma'})]
			)
		).toEqual([alpha, gamma]);
	});

	it('matches an order by its Salesforce project ID before its name', () => {
		expect(
			getProjectsWithOrders(
				[alpha, beta],
				[
					order({
						projectName: 'Alpha',
						salesforceProjectId: 'PRJCT-BETA',
					}),
				]
			)
		).toEqual([beta]);
	});

	it('keeps no project when the account has no placed order', () => {
		expect(getProjectsWithOrders([alpha, beta], [])).toEqual([]);
	});
});
