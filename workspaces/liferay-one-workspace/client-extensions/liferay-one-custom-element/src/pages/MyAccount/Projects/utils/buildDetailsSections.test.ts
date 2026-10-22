/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render} from '@testing-library/react';
import {Fragment, createElement} from 'react';
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

function getSections(
	profile: Parameters<typeof buildDetailsSections>[0],
	context: Partial<Parameters<typeof buildDetailsSections>[1]> = {}
) {
	return buildDetailsSections(profile, {
		accountName: 'Acme',
		contract,
		orderInfo,
		productName: 'Liferay Portal',
		...context,
	}).map(({rows, title}) => [
		title,
		rows.map(({label, value}) => [label, value]),
	]);
}

const environmentEntitlement = {
	endDate: '2099-08-09T12:00:00Z',
	environment: 'production',
	provisionedCount: 1,
	quantity: 2,
	startDate: '2026-08-09T12:00:00Z',
};

const environmentRows = [
	['Start Date', 'Aug 9, 2026'],
	['Expiration Date', 'Aug 9, 2099'],
	['Status', 'Active'],
];

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

	it('shows the order and the security incident contacts as email links for basic incident', () => {
		const rows = getRows('basic-incident', {
			securityIncidentContacts: [
				{emailAddress: 'ana@example.com', name: 'Ana'},
				{emailAddress: 'cy@example.com', name: 'Cy'},
			],
		});

		const [label, value] = rows.at(-1)!;

		expect(rows.slice(0, -1)).toEqual(orderRows);
		expect(label).toBe('Security Incident Contact');

		const {container} = render(createElement(Fragment, null, value));

		expect(container.textContent).toBe('Ana, Cy');
		expect(
			[...container.querySelectorAll('a')].map((link) => [
				link.textContent,
				link.getAttribute('href'),
			])
		).toEqual([
			['Ana', 'mailto:ana@example.com'],
			['Cy', 'mailto:cy@example.com'],
		]);
	});

	it('shows one section per environment for env instance', () => {
		expect(
			getSections('env-instance', {
				environmentEntitlements: [
					{
						...environmentEntitlement,
						environment: 'non-production',
						provisionedCount: 0,
						quantity: 3,
					},
					environmentEntitlement,
				],
			})
		).toEqual([
			[
				'Production',
				[['Keys Provisioned', '1 of 2'], ...environmentRows],
			],
			[
				'Non-Production',
				[['Keys Provisioned', '0 of 3'], ...environmentRows],
			],
		]);
	});

	it('shows the purchased quantity per environment for env commerce', () => {
		expect(
			getSections('env-commerce', {
				environmentEntitlements: [environmentEntitlement],
			})
		).toEqual([['Production', [['Purchased', '2'], ...environmentRows]]]);
	});

	it('adds up the entitlements of one environment', () => {
		expect(
			getSections('env-instance', {
				environmentEntitlements: [
					environmentEntitlement,
					{
						...environmentEntitlement,
						endDate: '2100-08-09T12:00:00Z',
						provisionedCount: 2,
						quantity: 3,
						startDate: '2027-08-09T12:00:00Z',
					},
				],
			})
		).toEqual([
			[
				'Production',
				[
					['Keys Provisioned', '3 of 5'],
					['Start Date', 'Aug 9, 2026'],
					['Expiration Date', 'Aug 9, 2100'],
					['Status', 'Active'],
				],
			],
		]);
	});

	it('leaves out the entitlements of other environments', () => {
		expect(
			getSections('env-instance', {
				environmentEntitlements: [
					{...environmentEntitlement, environment: 'developer'},
					environmentEntitlement,
				],
			}).map(([title]) => title)
		).toEqual(['Production']);
	});

	it('shows an untitled section for entitlements without an environment', () => {
		expect(
			getSections('env-commerce', {
				environmentEntitlements: [
					{...environmentEntitlement, environment: ''},
				],
			})
		).toEqual([[undefined, [['Purchased', '2'], ...environmentRows]]]);
	});

	it('shows the status from the entitlement dates', () => {
		const statuses = [
			['2020-01-01T12:00:00Z', '2021-01-01T12:00:00Z'],
			['2099-01-01T12:00:00Z', '2100-01-01T12:00:00Z'],
		].map(
			([startDate, endDate]) =>
				getRows('env-commerce', {
					environmentEntitlements: [
						{...environmentEntitlement, endDate, startDate},
					],
				}).at(-1)?.[1]
		);

		expect(statuses).toEqual(['Expired', 'Not Activated']);
	});

	it('falls back to the order and the contract without entitlements', () => {
		const rows = [...orderRows, ...contractRows];

		expect(getRows('env-commerce')).toEqual(rows);
		expect(getRows('env-instance', {environmentEntitlements: []})).toEqual(
			rows
		);
	});
});
