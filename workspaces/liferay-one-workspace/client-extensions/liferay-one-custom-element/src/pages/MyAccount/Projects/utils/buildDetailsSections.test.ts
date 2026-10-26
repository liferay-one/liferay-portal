/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render} from '@testing-library/react';
import {Fragment, createElement} from 'react';
import {describe, expect, it, vi} from 'vitest';

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
	skuProductNames: ['Liferay Analytics Cloud Subscription - Business'],
};

function getRows(
	profile: Parameters<typeof buildDetailsSections>[0],
	context: Partial<Parameters<typeof buildDetailsSections>[1]> = {}
) {
	return buildDetailsSections(profile, {
		accountName: 'Acme',
		contract,
		itemType: 'application',
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
		itemType: 'application',
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
	instanceSize: '',
	provisionedCount: 1,
	quantity: 2,
	skuProductName: '',
	startDate: '2026-08-09T12:00:00Z',
	terminationStatus: '',
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

	it('shows the order date of the order as its calendar day', () => {
		expect(
			getRows('basic', {orderDate: '2023-09-30T00:00:00Z'})[1]
		).toEqual(['Order Date', 'Sep 30, 2023']);
	});

	it('leaves out the purchaser when the order has none', () => {
		expect(
			getRows('basic', {orderInfo: {...orderInfo, purchasedBy: ''}})
		).toEqual(orderRows.slice(0, 4));
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
				[
					['Instance Size', '-'],
					['Keys Provisioned', '1 of 2'],
					...environmentRows,
				],
			],
			[
				'Non-Production',
				[
					['Instance Size', '-'],
					['Keys Provisioned', '0 of 3'],
					...environmentRows,
				],
			],
		]);
	});

	it('shows the instance sizes of the current term for env instance', () => {
		expect(
			getSections('env-instance', {
				environmentEntitlements: [
					{...environmentEntitlement, instanceSize: '2'},
					{...environmentEntitlement, instanceSize: '1'},
					{...environmentEntitlement, instanceSize: '2'},
					{
						...environmentEntitlement,
						endDate: '2021-08-09T12:00:00Z',
						instanceSize: '4',
						startDate: '2020-08-09T12:00:00Z',
					},
				],
			})
		).toEqual([
			[
				'Production',
				[
					['Instance Size', '2, 1'],
					['Keys Provisioned', '3 of 6'],
					...environmentRows,
				],
			],
		]);
	});

	it('orders the backup, complimentary, and limited environments after the others', () => {
		expect(
			getSections('env-commerce', {
				environmentEntitlements: [
					{...environmentEntitlement, environment: 'limited'},
					{...environmentEntitlement, environment: ''},
					{...environmentEntitlement, environment: 'complimentary'},
					{...environmentEntitlement, environment: 'backup'},
					{...environmentEntitlement, environment: 'non-production'},
					environmentEntitlement,
				],
			}).map(([title]) => title)
		).toEqual([
			'Production',
			'Non-Production',
			'Backup',
			'Complimentary',
			'Limited',
			undefined,
		]);
	});

	it('shows the purchased quantity per environment for env commerce', () => {
		expect(
			getSections('env-commerce', {
				environmentEntitlements: [environmentEntitlement],
			})
		).toEqual([['Production', [['Purchased', '2'], ...environmentRows]]]);
	});

	it('adds up the active entitlements of one environment', () => {
		expect(
			getSections('env-instance', {
				environmentEntitlements: [
					environmentEntitlement,
					{
						...environmentEntitlement,
						endDate: '2100-08-09T12:00:00Z',
						provisionedCount: 2,
						quantity: 3,
						startDate: '2025-08-09T12:00:00Z',
					},
				],
			})
		).toEqual([
			[
				'Production',
				[
					['Instance Size', '-'],
					['Keys Provisioned', '3 of 5'],
					['Start Date', 'Aug 9, 2025'],
					['Expiration Date', 'Aug 9, 2100'],
					['Status', 'Active'],
				],
			],
		]);
	});

	it('leaves out the other terms of an environment while one is active', () => {
		expect(
			getSections('env-instance', {
				environmentEntitlements: [
					{
						...environmentEntitlement,
						endDate: '2021-08-09T12:00:00Z',
						provisionedCount: 4,
						quantity: 4,
						startDate: '2020-08-09T12:00:00Z',
					},
					environmentEntitlement,
					{
						...environmentEntitlement,
						endDate: '2101-08-09T12:00:00Z',
						provisionedCount: 0,
						quantity: 6,
						startDate: '2099-08-09T12:00:00Z',
					},
				],
			})
		).toEqual([
			[
				'Production',
				[
					['Instance Size', '-'],
					['Keys Provisioned', '1 of 2'],
					...environmentRows,
				],
			],
		]);
	});

	it('shows the next term of an environment when no term is active', () => {
		expect(
			getSections('env-commerce', {
				environmentEntitlements: [
					{
						...environmentEntitlement,
						endDate: '2021-08-09T12:00:00Z',
						startDate: '2020-08-09T12:00:00Z',
					},
					{
						...environmentEntitlement,
						endDate: '2101-08-09T12:00:00Z',
						quantity: 6,
						startDate: '2099-08-09T12:00:00Z',
					},
				],
			})
		).toEqual([
			[
				'Production',
				[
					['Purchased', '6'],
					['Start Date', 'Aug 9, 2099'],
					['Expiration Date', 'Aug 9, 2101'],
					['Status', 'Not Activated'],
				],
			],
		]);
	});

	it('shows the latest term of an environment when every term ended', () => {
		expect(
			getSections('env-commerce', {
				environmentEntitlements: [
					{
						...environmentEntitlement,
						endDate: '2021-08-09T12:00:00Z',
						quantity: 4,
						startDate: '2020-08-09T12:00:00Z',
					},
					{
						...environmentEntitlement,
						endDate: '2022-08-09T12:00:00Z',
						startDate: '2021-08-09T12:00:00Z',
					},
				],
			})
		).toEqual([
			[
				'Production',
				[
					['Purchased', '2'],
					['Start Date', 'Aug 9, 2021'],
					['Expiration Date', 'Aug 9, 2022'],
					['Status', 'Expired'],
				],
			],
		]);
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

	it('shows the status from the entitlement dates and termination status', () => {
		const statuses = [
			['2020-01-01T12:00:00Z', '2021-01-01T12:00:00Z', ''],
			['2099-01-01T12:00:00Z', '2100-01-01T12:00:00Z', ''],
			['2026-01-01T12:00:00Z', '2099-01-01T12:00:00Z', 'suspended'],
			['2026-01-01T12:00:00Z', '2099-01-01T12:00:00Z', 'terminated'],
		].map(
			([startDate, endDate, terminationStatus]) =>
				getRows('env-commerce', {
					environmentEntitlements: [
						{
							...environmentEntitlement,
							endDate,
							startDate,
							terminationStatus,
						},
					],
				}).at(-1)?.[1]
		);

		expect(statuses).toEqual([
			'Expired',
			'Not Activated',
			'Suspended',
			'Terminated',
		]);
	});

	it('shows an entitlement as expired on its expiration date', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 7, 9, 12));

		try {
			const statuses = [
				'2026-08-09T00:00:00.000Z',
				'2026-08-10T00:00:00.000Z',
			].map(
				(endDate) =>
					getRows('env-commerce', {
						environmentEntitlements: [
							{
								...environmentEntitlement,
								endDate,
								startDate: '2025-08-09T00:00:00.000Z',
							},
						],
					}).at(-1)?.[1]
			);

			expect(statuses).toEqual(['Expired', 'Active']);
		}
		finally {
			vi.useRealTimers();
		}
	});

	it('shows a dash for keys that were not counted', () => {
		expect(
			getRows('env-instance', {
				environmentEntitlements: [
					{...environmentEntitlement, provisionedCount: undefined},
				],
			})[1]
		).toEqual(['Keys Provisioned', '-']);
	});

	it('takes the start date from the entitlements that have one', () => {
		expect(
			getRows('env-commerce', {
				environmentEntitlements: [
					{...environmentEntitlement, startDate: ''},
					environmentEntitlement,
				],
			})[1]
		).toEqual(['Start Date', 'Aug 9, 2026']);
	});

	it('falls back to the order and the contract without entitlements', () => {
		const rows = [...orderRows, ...contractRows];

		expect(getRows('env-commerce')).toEqual(rows);
		expect(getRows('env-instance', {environmentEntitlements: []})).toEqual(
			rows
		);
	});

	it('shows the calendar day of dates at midnight UTC', () => {
		expect(
			getRows('env-commerce', {
				environmentEntitlements: [
					{
						...environmentEntitlement,
						endDate: '2099-08-09T00:00:00.000Z',
						startDate: '2026-08-09T00:00:00.000Z',
					},
				],
			}).slice(1, 3)
		).toEqual([
			['Start Date', 'Aug 9, 2026'],
			['Expiration Date', 'Aug 9, 2099'],
		]);
	});

	it('shows the SKU product name first for a product', () => {
		const productRow = [
			'Product',
			'Liferay Analytics Cloud Subscription - Business',
		];

		expect(getRows('basic', {itemType: 'product'})).toEqual([
			productRow,
			...orderRows,
		]);
		expect(getRows('basic-incident', {itemType: 'product'})[0]).toEqual(
			productRow
		);
		expect(getRows('dates-status', {itemType: 'product'})).toEqual([
			productRow,
			...contractRows,
		]);
		expect(getRows('env-commerce', {itemType: 'product'})).toEqual([
			productRow,
			...orderRows,
			...contractRows,
		]);
	});

	it('leaves out the SKU product names that repeat the product name', () => {
		expect(
			getRows('basic', {
				itemType: 'product',
				orderInfo: {
					...orderInfo,
					skuProductNames: ['Liferay Analytics Cloud', '', 'Gold'],
				},
			})[0]
		).toEqual(['Product', 'Gold']);
		expect(
			getRows('basic', {
				itemType: 'product',
				orderInfo: {
					...orderInfo,
					skuProductNames: ['Liferay Analytics Cloud', ''],
				},
			})
		).toEqual(orderRows);
	});

	it('leaves out the SKU product name for an application', () => {
		expect(getRows('basic')).toEqual(orderRows);
	});

	it('shows the SKU product names of the current term per environment', () => {
		expect(
			getSections('env-instance', {
				environmentEntitlements: [
					{
						...environmentEntitlement,
						skuProductName:
							'Subscription Portal EE - Platinum (Production)',
					},
					{
						...environmentEntitlement,
						skuProductName:
							'Subscription Portal EE - Platinum (Production)',
					},
					{
						...environmentEntitlement,
						skuProductName:
							'Subscription Portal EE - Gold (Production)',
					},
					{
						...environmentEntitlement,
						endDate: '2025-08-09T12:00:00Z',
						skuProductName:
							'Subscription Portal EE - Basic (Production)',
						startDate: '2024-08-09T12:00:00Z',
					},
					{
						...environmentEntitlement,
						environment: 'non-production',
						skuProductName:
							'Subscription Portal EE - Platinum (Non-Production)',
					},
				],
				itemType: 'product',
			})
		).toEqual([
			[
				'Production',
				[
					[
						'Product',
						'Subscription Portal EE - Platinum (Production), Subscription Portal EE - Gold (Production)',
					],
					['Instance Size', '-'],
					['Keys Provisioned', '3 of 6'],
					...environmentRows,
				],
			],
			[
				'Non-Production',
				[
					[
						'Product',
						'Subscription Portal EE - Platinum (Non-Production)',
					],
					['Instance Size', '-'],
					['Keys Provisioned', '1 of 2'],
					...environmentRows,
				],
			],
		]);
	});
});
