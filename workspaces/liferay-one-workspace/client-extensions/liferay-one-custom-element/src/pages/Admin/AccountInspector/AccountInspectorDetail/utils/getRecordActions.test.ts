/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it, vi} from 'vitest';

import getRecordActions from './getRecordActions';

import type {Account} from '~/types/accounts';

vi.mock('~/utils/siteUtils', () => ({getSiteURL: () => '/web/one'}));

const ACCOUNT: Account = {
	dateCreated: '2026-01-01T00:00:00Z',
	description: '',
	emailAddress: '',
	externalReferenceCode: 'ACCNT-001',
	id: 100,
	name: 'Omni',
	numberOfUsers: 0,
	status: 0,
	taxId: '',
	type: 'business',
};

describe('[MOD-ADMIN-ACCOUNTINSPECTOR-ACCOUNTINSPECTORDETAIL-GETRECORDACTIONS] getRecordActions', () => {
	it('opens a project in the account dashboard, its API response, and copies its ID and ERC', () => {
		expect(
			getRecordActions(ACCOUNT, 'projects', {
				actions: {get: {href: 'http://x/o/c/projects/20'}},
				externalReferenceCode: 'PRJCT-001',
				id: 20,
			})
		).toEqual([
			{
				href: '/web/one/my-account#/ACCNT-001/project/PRJCT-001',
				label: 'open-project',
			},
			{
				href: 'http://x/o/c/projects/20',
				label: 'open-api-response',
				newTab: true,
			},
			{copyText: '20', label: 'copy-id'},
			{copyText: 'PRJCT-001', label: 'copy-external-reference-code'},
		]);
	});

	it('links a contract and a license key only when they have a project', () => {
		const contract = {
			externalReferenceCode: 'C-1',
			id: 30,
			r_projectToContract_c_projectERC: 'PRJCT-001',
		};

		expect(getRecordActions(ACCOUNT, 'contracts', contract)[0]).toEqual({
			href: '/web/one/my-account#/ACCNT-001/project/PRJCT-001/contract/C-1/products',
			label: 'open-contract',
		});
		expect(
			getRecordActions(ACCOUNT, 'licenseKeys', {
				externalReferenceCode: 'KEY-1',
				id: 60,
				r_projectToLicenseKey_c_projectERC: '',
			})[0]
		).toEqual({copyText: '60', label: 'copy-id'});
	});

	it('fills the ID into an order API link and opens the order in the dashboard', () => {
		const actions = getRecordActions(ACCOUNT, 'orders', {
			actions: {
				get: {
					href: 'http://x/o/headless-commerce-admin-order/v1.0/orders/{id}',
				},
			},
			id: 50,
		});

		expect(actions.slice(0, 2)).toEqual([
			{
				href: '/web/one/my-account#/ACCNT-001/orders/50',
				label: 'open-order',
			},
			{
				href: 'http://x/o/headless-commerce-admin-order/v1.0/orders/50',
				label: 'open-api-response',
				newTab: true,
			},
		]);
	});

	it('uses the user account link for a user and offers no dashboard link for other collections', () => {
		expect(
			getRecordActions(ACCOUNT, 'users', {
				actions: {
					'get-user-account': {
						href: 'http://x/o/headless-admin-user/v1.0/user-accounts/7',
					},
				},
				id: 7,
			}).map(({label}) => label)
		).toEqual(['open-account-members', 'open-api-response', 'copy-id']);
		expect(
			getRecordActions(ACCOUNT, 'environments', {id: 8}).map(
				({label}) => label
			)
		).toEqual(['copy-id']);
	});

	it('offers no API link that is not http or https', () => {
		expect(
			getRecordActions(ACCOUNT, 'projects', {
				actions: {get: {href: 'javascript:alert(1)'}},
				id: 20,
			}).map(({label}) => label)
		).not.toContain('open-api-response');
	});
});
