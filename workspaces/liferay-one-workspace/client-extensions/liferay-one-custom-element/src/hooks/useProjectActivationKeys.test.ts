/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {useProjectActivationKeys} from './useProjectActivationKeys';

const {liferayMock, objectItems, useObjectItemsMock, useProjectMock} =
	vi.hoisted(() => {
		const objectItems: Record<
			string,
			{items?: unknown[]; loading?: boolean}
		> = {};

		return {
			liferayMock: {
				CommerceContext: {} as {account?: {accountId: number}},
			},
			objectItems,
			useObjectItemsMock: vi.fn((path: string | null) => ({
				error: undefined,
				items: path ? objectItems[path]?.items : undefined,
				loading: path ? objectItems[path]?.loading ?? false : false,
				revalidate: vi.fn(),
			})),
			useProjectMock: vi.fn(),
		};
	});

vi.mock('~/context/ProjectContext', () => ({useProject: useProjectMock}));

vi.mock('~/hooks/useObjectItems', () => ({
	useObjectItems: useObjectItemsMock,
}));

vi.mock('~/services/liferay/liferay', () => ({Liferay: liferayMock}));

vi.mock(
	'~/pages/MyAccount/Projects/LicenseKeys/GenerateActivationKey/utils',
	() => {
		const order = ['PRDCT-DXP', 'PRDCT-COMMERCE'];
		const labels: Record<string, string> = {
			'PRDCT-COMMERCE': 'Commerce',
			'PRDCT-DXP': 'DXP',
		};

		return {
			getLeadingProductLabel: (externalReferenceCode: string) =>
				labels[externalReferenceCode] ?? '',
			getLeadingProductRank: (externalReferenceCode: string) => {
				const index = order.indexOf(externalReferenceCode);

				return index === -1 ? order.length : index;
			},
		};
	}
);

const NOW = new Date('2026-06-15T12:00:00');

function daysFromNow(days: number) {
	return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function renderActivationKeys({
	activationKeys = [],
	licenseKeys = [],
}: {
	activationKeys?: unknown[];
	licenseKeys?: unknown[];
} = {}) {
	objectItems['/o/c/activationkeys'] = {items: activationKeys};
	objectItems['/o/c/licensekeys'] = {items: licenseKeys};

	return renderHook(() => useProjectActivationKeys()).result.current;
}

describe('[HOOK-USEPROJECTACTIVATIONKEYS] useProjectActivationKeys', () => {
	beforeEach(() => {
		vi.useFakeTimers({toFake: ['Date']});
		vi.setSystemTime(NOW);

		for (const key of Object.keys(objectItems)) {
			delete objectItems[key];
		}

		liferayMock.CommerceContext = {account: {accountId: 77}};
		useObjectItemsMock.mockClear();
		useProjectMock.mockReturnValue({projectId: 'PRJCT-1'});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('filters activation keys and license keys by project when a project is selected', () => {
		renderActivationKeys();

		expect(useObjectItemsMock).toHaveBeenCalledWith(
			'/o/c/activationkeys',
			expect.objectContaining({
				filter: "r_projectToActivationKey_c_projectERC eq 'PRJCT-1'",
				sort: 'startDate:desc',
			})
		);
		expect(useObjectItemsMock).toHaveBeenCalledWith(
			'/o/c/licensekeys',
			expect.objectContaining({
				filter: "r_projectToLicenseKey_c_projectERC eq 'PRJCT-1'",
			})
		);
	});

	it('escapes quotes in the project ERC filter', () => {
		useProjectMock.mockReturnValue({projectId: "PRJCT-'1"});

		renderActivationKeys();

		expect(useObjectItemsMock).toHaveBeenCalledWith(
			'/o/c/activationkeys',
			expect.objectContaining({
				filter: "r_projectToActivationKey_c_projectERC eq 'PRJCT-''1'",
			})
		);
	});

	it('filters by account when the project is the unassigned project', () => {
		useProjectMock.mockReturnValue({projectId: 'one-time-purchases'});

		renderActivationKeys();

		expect(useObjectItemsMock).toHaveBeenCalledWith(
			'/o/c/activationkeys',
			expect.objectContaining({
				filter: "r_accountEntryToActivationKey_accountEntryId eq '77'",
			})
		);
		expect(useObjectItemsMock).toHaveBeenCalledWith(
			'/o/c/licensekeys',
			expect.objectContaining({
				filter: "r_accountEntryToLicenseKey_accountEntryId eq '77'",
			})
		);
	});

	it('filters by account when no project is selected', () => {
		useProjectMock.mockReturnValue({projectId: undefined});

		renderActivationKeys();

		expect(useObjectItemsMock).toHaveBeenCalledWith(
			'/o/c/activationkeys',
			expect.objectContaining({
				filter: "r_accountEntryToActivationKey_accountEntryId eq '77'",
			})
		);
	});

	it('does not fetch without a project or an account', () => {
		liferayMock.CommerceContext = {};
		useProjectMock.mockReturnValue({projectId: undefined});

		const {activationKeys} = renderActivationKeys();

		expect(useObjectItemsMock.mock.calls[0][0]).toBeNull();
		expect(useObjectItemsMock.mock.calls[1][0]).toBeNull();
		expect(activationKeys).toEqual([]);
	});

	it('groups license keys under their activation key and picks the leading product', () => {
		const {activationKeys} = renderActivationKeys({
			activationKeys: [
				{
					active: true,
					dateCreated: daysFromNow(-200),
					endDate: daysFromNow(365),
					externalReferenceCode: 'AK-1',
					id: 1,
					startDate: daysFromNow(-200),
					type: 'standard',
				},
			],
			licenseKeys: [
				{
					active: true,
					description: 'First',
					name: 'Commerce key',
					productVersion: '7.4',
					r_activationKeyToLicenseKey_c_activationKeyId: 1,
					r_commerceProductToLicenseKey_CProductERC: 'PRDCT-COMMERCE',
				},
				{
					active: true,
					name: 'DXP key',
					r_activationKeyToLicenseKey_c_activationKeyId: 1,
					r_commerceProductToLicenseKey_CProductERC: 'PRDCT-DXP',
				},
				{
					active: true,
					name: 'Other activation key',
					r_activationKeyToLicenseKey_c_activationKeyId: 2,
					r_commerceProductToLicenseKey_CProductERC: 'PRDCT-DXP',
				},
			],
		});

		expect(activationKeys).toHaveLength(1);
		expect(activationKeys[0]).toMatchObject({
			activationKeyId: '1',
			badge: undefined,
			complimentary: false,
			description: 'First',
			id: 'AK-1',
			name: 'Commerce key',
			productName: 'DXP',
			productVersion: '7.4',
			status: 'active',
			type: 'standard',
		});
	});

	it('marks a complimentary activation key and formats its dates', () => {
		const {activationKeys} = renderActivationKeys({
			activationKeys: [
				{
					active: true,
					endDate: '2027-03-04T12:00:00',
					externalReferenceCode: 'AK-1',
					startDate: '2026-01-02T12:00:00',
					type: 'complimentary',
				},
			],
		});

		expect(activationKeys[0]).toMatchObject({
			activationKeyId: '',
			complimentary: true,
			description: '',
			expirationDate: 'Mar 4, 2027',
			expirationDateValue: '2027-03-04',
			name: '',
			productName: '',
			startDate: 'Jan 2, 2026',
			startDateValue: '2026-01-02',
		});
	});

	it('appends license keys without an activation key as unaggregated rows only when they have an ERC', () => {
		const {activationKeys} = renderActivationKeys({
			activationKeys: [
				{active: true, externalReferenceCode: 'AK-1', id: 1},
			],
			licenseKeys: [
				{
					active: true,
					complimentary: true,
					customExpirationDate: daysFromNow(200),
					description: 'Loose',
					externalReferenceCode: 'LK-1',
					id: 9,
					licenseType: 'production',
					name: 'Loose key',
					productName: 'Fallback Product',
					productVersion: '2025.Q1',
					startDate: daysFromNow(-100),
				},
				{active: true, name: 'No ERC'},
			],
		});

		expect(activationKeys).toHaveLength(2);
		expect(activationKeys[0].id).toBe('AK-1');
		expect(activationKeys[1]).toMatchObject({
			activationKeyId: '',
			complimentary: true,
			description: 'Loose',
			id: 'LK-1',
			licenseKeyId: '9',
			name: 'Loose key',
			productName: 'Fallback Product',
			productVersion: '2025.Q1',
			status: 'active',
			type: 'production',
			unaggregated: true,
		});
	});

	it('labels an unaggregated row with the leading product label before the product name', () => {
		const {activationKeys} = renderActivationKeys({
			licenseKeys: [
				{
					active: true,
					externalReferenceCode: 'LK-1',
					productName: 'Fallback Product',
					r_commerceProductToLicenseKey_CProductERC: 'PRDCT-DXP',
				},
			],
		});

		expect(activationKeys[0].productName).toBe('DXP');
	});

	it.each([
		['an inactive key', {active: false}, 'not-activated'],
		[
			'a key that starts in the future',
			{active: true, startDate: daysFromNow(5)},
			'not-activated',
		],
		[
			'a key whose end date passed',
			{
				active: true,
				endDate: daysFromNow(-1),
				startDate: daysFromNow(-30),
			},
			'expired',
		],
		[
			'a started key that has not ended',
			{
				active: true,
				endDate: daysFromNow(30),
				startDate: daysFromNow(-30),
			},
			'active',
		],
		['a key with no dates', {active: true}, 'active'],
	])('resolves the status of %s', (_label, node, status) => {
		const {activationKeys} = renderActivationKeys({
			activationKeys: [{...node, externalReferenceCode: 'AK-1', id: 1}],
		});

		expect(activationKeys[0].status).toBe(status);
	});

	it('resolves the status of an unaggregated key from its custom expiration date', () => {
		const {activationKeys} = renderActivationKeys({
			licenseKeys: [
				{
					active: true,
					customExpirationDate: daysFromNow(-1),
					externalReferenceCode: 'LK-1',
				},
			],
		});

		expect(activationKeys[0].status).toBe('expired');
	});

	it.each([
		[
			'a key created within 15 days',
			{
				active: true,
				dateCreated: daysFromNow(-15),
				endDate: daysFromNow(10),
			},
			'new-activation-key',
		],
		[
			'a key created 16 days ago that expires within 90 days',
			{
				active: true,
				dateCreated: daysFromNow(-16),
				endDate: daysFromNow(90),
			},
			'to-be-renewed',
		],
		[
			'a key that expires in 91 days',
			{
				active: true,
				dateCreated: daysFromNow(-100),
				endDate: daysFromNow(91),
			},
			undefined,
		],
		[
			'an expired key',
			{
				active: true,
				dateCreated: daysFromNow(-100),
				endDate: daysFromNow(-2),
			},
			undefined,
		],
		[
			'an inactive key that expires soon',
			{
				active: false,
				dateCreated: daysFromNow(-100),
				endDate: daysFromNow(10),
			},
			undefined,
		],
		[
			'an active key with no end date',
			{active: true, dateCreated: daysFromNow(-100)},
			undefined,
		],
	])('resolves the badge of %s', (_label, node, badge) => {
		const {activationKeys} = renderActivationKeys({
			activationKeys: [{...node, externalReferenceCode: 'AK-1', id: 1}],
		});

		expect(activationKeys[0].badge).toBe(badge);
	});

	it('is loading while either list loads', () => {
		objectItems['/o/c/activationkeys'] = {items: [], loading: false};
		objectItems['/o/c/licensekeys'] = {items: [], loading: true};

		const {result} = renderHook(() => useProjectActivationKeys());

		expect(result.current.loading).toBe(true);
	});
});
