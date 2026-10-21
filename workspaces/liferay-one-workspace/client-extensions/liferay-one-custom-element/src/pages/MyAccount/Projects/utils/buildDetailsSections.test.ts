/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import buildDetailsSections from './buildDetailsSections';

import type {ProjectContract} from '~/hooks/useProjectCommerce';

const contract = {
	endDate: '2027-08-09T12:00:00Z',
	externalReferenceCode: 'C_CONTRACT_1',
	name: 'C_CONTRACT_1',
	startDate: '2026-08-09T12:00:00Z',
	status: 'active',
} as ProjectContract;

const orderInfo = {
	itemName: 'Liferay Analytics Cloud Subscription - Business',
	orderDate: 'Mar 15, 2026',
	orderId: '11',
	purchaseNumber: 'PO-1',
	purchasedBy: 'Jane Doe',
	quantity: '5',
};

function getRows(
	profile: Parameters<typeof buildDetailsSections>[0],
	context: Partial<Parameters<typeof buildDetailsSections>[1]> = {}
) {
	return buildDetailsSections(profile, {
		accountName: 'Acme',
		contract,
		orderInfo,
		productName: 'Liferay Analytics Cloud',
		...context,
	}).flatMap(({rows}) => rows.map(({label, value}) => [label, value]));
}

const contractRows = [
	['Start Date', 'Aug 9, 2026'],
	['Expiration Date', 'Aug 9, 2027'],
	['Status', 'Active'],
];

const orderRows = [
	['Order ID', '11'],
	['Order Date', 'Mar 15, 2026'],
	['Purchase Number', 'PO-1'],
	['Customer Account', 'Acme'],
	['Purchased by', 'Jane Doe'],
];

describe('[ROUTE-MY-ACCOUNT-PRODUCTERC] buildDetailsSections', () => {
	it('shows the tier, the purchased quantity, and the contract for analytics', () => {
		expect(getRows('analytics')).toEqual([
			['Tier Name', 'Liferay Analytics Cloud Subscription - Business'],
			['Purchased', '5'],
			...contractRows,
		]);
	});

	it('shows the tier and the contract for paas and saas', () => {
		const rows = [
			['Tier Name', 'Liferay Analytics Cloud Subscription - Business'],
			...contractRows,
		];

		expect(getRows('paas')).toEqual(rows);
		expect(getRows('saas')).toEqual(rows);
	});

	it('falls back to the product name for the tier without an order', () => {
		expect(
			getRows('paas', {
				orderInfo: {...orderInfo, itemName: '', quantity: ''},
				productName: 'PaaS Experience',
			})
		).toEqual([['Tier Name', 'PaaS Experience'], ...contractRows]);
	});

	it('shows the order for basic', () => {
		expect(getRows('basic')).toEqual(orderRows);
	});

	it('shows the order and the incident report contacts for basic incident', () => {
		expect(
			getRows('basic-incident', {incidentReportContacts: ['Ana', 'Cy']})
		).toEqual([...orderRows, ['Incident Report Contacts', 'Ana, Cy']]);
	});
});
