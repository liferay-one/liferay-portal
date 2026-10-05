/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import i18n from '~/i18n';

import useProvisioningData from './useProvisioningData';

const mocks = vi.hoisted(() => ({
	data: undefined as unknown,
	mutate: vi.fn(),
	resourceRequirements: {isLoading: false, projectsUsage: undefined},
	useGetProductByOrderId: vi.fn(),
}));

vi.mock('~/hooks/useGetProductByOrderId', () => ({
	default: mocks.useGetProductByOrderId,
}));

vi.mock('~/hooks/useGetResourceInfo', () => ({
	default: () => mocks.resourceRequirements,
}));

type DeploymentInput = {
	id: string;
	loading?: boolean;
	projectId: string;
};

function order({
	createDate = '2026-06-01T12:00:00',
	orderItems = [{id: 1, quantity: 1}],
	provisioning = [],
}: {
	createDate?: string;
	orderItems?: {id: number; quantity: number}[];
	provisioning?: {deployments: DeploymentInput[]; orderItemId: number}[];
}) {
	return {
		createDate,
		customFields: {
			'cloud-provisioning': JSON.stringify(provisioning),
		},
		id: 77,
		placedOrderItems: orderItems,
	};
}

function product(licenseType: string) {
	return {
		productSpecifications: [
			{specificationKey: 'license-type', value: licenseType},
		],
	};
}

function setData(placedOrder: unknown, licenseType = 'Subscription') {
	mocks.data = {placedOrder, product: product(licenseType)};
}

describe('[HOOK-MYACCOUNT-PROJECTS-APPPROVISIONING-USEPROVISIONINGDATA] useProvisioningData', () => {
	beforeEach(() => {
		vi.useFakeTimers({toFake: ['Date']});
		vi.setSystemTime(new Date('2026-10-05T12:00:00'));

		mocks.data = undefined;
		mocks.useGetProductByOrderId.mockReset();
		mocks.useGetProductByOrderId.mockImplementation(() => ({
			data: mocks.data,
			mutate: mocks.mutate,
		}));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('derives IN_PROGRESS for a loading deployment', () => {
		setData(
			order({
				provisioning: [
					{
						deployments: [
							{id: 'dep-1', loading: true, projectId: 'acme-prd'},
						],
						orderItemId: 1,
					},
				],
			})
		);

		const {result} = renderHook(() => useProvisioningData('77'));

		expect(result.current.provisioningTableData[0].status).toBe(
			'in-progress'
		);
	});

	it('derives EXPIRED for a subscription created more than one year ago', () => {
		setData(
			order({
				createDate: '2025-09-01T12:00:00',
				provisioning: [
					{
						deployments: [{id: 'dep-1', projectId: 'acme-prd'}],
						orderItemId: 1,
					},
				],
			})
		);

		const {result} = renderHook(() => useProvisioningData('77'));

		expect(result.current.provisioningTableData[0].status).toBe('expired');
	});

	it('derives INSTALLED or READY_TO_INSTALL from the matching deployment', () => {
		setData(
			order({
				orderItems: [{id: 1, quantity: 2}],
				provisioning: [
					{
						deployments: [{id: 'dep-1', projectId: 'acme-prd'}],
						orderItemId: 1,
					},
				],
			})
		);

		const {result} = renderHook(() => useProvisioningData('77'));

		expect(
			result.current.provisioningTableData.map(({status}) => status)
		).toEqual(['installed', 'ready-to-install']);
	});

	it('does not expire a perpetual license even after one year', () => {
		setData(
			order({
				createDate: '2024-01-15T12:00:00',
				provisioning: [
					{
						deployments: [{id: 'dep-1', projectId: 'acme-prd'}],
						orderItemId: 1,
					},
				],
			}),
			'Perpetual'
		);

		const {result} = renderHook(() => useProvisioningData('77'));

		expect(result.current.provisioningTableData[0]).toMatchObject({
			expirationDate: i18n.translate('does-not-expire'),
			status: 'installed',
			type: 'Perpetual',
		});
	});

	it('expands each order item to one row per quantity and matches deployments by order item', () => {
		setData(
			order({
				orderItems: [
					{id: 1, quantity: 2},
					{id: 2, quantity: 1},
				],
				provisioning: [
					{
						deployments: [{id: 'dep-2', projectId: 'beta-uat'}],
						orderItemId: 2,
					},
					{
						deployments: [{id: 'dep-1', projectId: 'acme-prd'}],
						orderItemId: 1,
					},
				],
			})
		);

		const {result} = renderHook(() => useProvisioningData('77'));

		expect(result.current.provisioningTableData).toEqual([
			{
				environment: 'PRD',
				expirationDate: 'Jun 01, 2027',
				id: 'dep-1',
				loading: undefined,
				orderItemId: 1,
				project: 'ACME',
				projectId: 'acme-prd',
				startDate: 'Jun 01, 2026',
				status: 'installed',
				type: 'Subscription',
			},
			{
				environment: '',
				expirationDate: 'Jun 01, 2027',
				id: 1,
				loading: undefined,
				orderItemId: 1,
				project: '',
				projectId: '',
				startDate: 'Jun 01, 2026',
				status: 'ready-to-install',
				type: 'Subscription',
			},
			{
				environment: 'UAT',
				expirationDate: 'Jun 01, 2027',
				id: 'dep-2',
				loading: undefined,
				orderItemId: 2,
				project: 'BETA',
				projectId: 'beta-uat',
				startDate: 'Jun 01, 2026',
				status: 'installed',
				type: 'Subscription',
			},
		]);
	});

	it('returns an empty order and no rows before data loads', () => {
		const {result} = renderHook(() => useProvisioningData('77'));

		expect(result.current.order).toEqual({});
		expect(result.current.provisioningTableData).toEqual([]);
		expect(result.current.mutateOrder).toBe(mocks.mutate);
		expect(result.current.resourceRequirements).toBe(
			mocks.resourceRequirements
		);
	});

	it('uses the faster refresh interval only while a deployment is in progress', () => {
		renderHook(() => useProvisioningData('77'));

		const [[orderId, {refreshInterval}]] =
			mocks.useGetProductByOrderId.mock.calls;

		expect(orderId).toBe('77');

		expect(refreshInterval(undefined)).toBe(240 * 1000);
		expect(
			refreshInterval({
				placedOrder: order({
					provisioning: [
						{
							deployments: [{id: 'dep-1', projectId: 'acme-prd'}],
							orderItemId: 1,
						},
					],
				}),
			})
		).toBe(240 * 1000);
		expect(
			refreshInterval({
				placedOrder: order({
					provisioning: [
						{
							deployments: [
								{
									id: 'dep-1',
									loading: true,
									projectId: 'acme-prd',
								},
							],
							orderItemId: 1,
						},
					],
				}),
			})
		).toBe(60 * 1000);
	});
});
