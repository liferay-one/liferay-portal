/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProject} from '~/context/ProjectContext';
import {useFetch} from '~/hooks/useFetch';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/utils/constants';

import {useProjectUsage} from './useProjectUsage';

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/hooks/useFetch', () => ({useFetch: vi.fn()}));

type Responses = Record<string, unknown[]>;

function mockFetch(responses: Responses) {
	vi.mocked(useFetch).mockImplementation(((url: string | null) => ({
		data: url && responses[url] ? {items: responses[url]} : undefined,
		error: undefined,
		isLoading: false,
	})) as unknown as typeof useFetch);
}

function mockProjectId(projectId: string) {
	vi.mocked(useProject).mockReturnValue({projectId} as ReturnType<
		typeof useProject
	>);
}

function toEntitlement(
	id: number,
	usageDefinitionId: number | undefined,
	overrides: Record<string, unknown> = {}
) {
	return {
		id,
		quantity: 0,
		r_entitlementDefinitionToEntitlement_c_entitlementDefinition: {
			r_usageDefinitionToEntitlementDefinition_c_usageDefinitionId:
				usageDefinitionId,
		},
		...overrides,
	};
}

function toEvent(entitlementId: number, quantity: number, eventTimestamp = '') {
	return {
		eventTimestamp,
		quantity,
		r_entitlementToUsageEvent_c_entitlementId: entitlementId,
	};
}

function getRequestedURLs() {
	return vi.mocked(useFetch).mock.calls.map(([url]) => url);
}

describe('[HOOK-USEPROJECTUSAGE] useProjectUsage', () => {
	beforeEach(() => {
		vi.mocked(useFetch).mockReset();
	});

	it('adds add on buckets multiplied by the overage bucket size to the included quantity', () => {
		mockProjectId('PRJCT-1');

		mockFetch({
			'/o/c/entitlements': [
				toEntitlement(1, 10, {quantity: 1000}),
				toEntitlement(2, 10, {
					name: 'events-add-on-bucket',
					quantity: 3,
				}),
			],
			'/o/c/usagedefinitions': [
				{
					id: 10,
					overageBucketSize: 500,
					period: 'total',
					unit: 'events',
				},
			],
			'/o/c/usageevents': [],
		});

		const {result} = renderHook(() => useProjectUsage());

		expect(result.current.usage).toEqual([
			{
				consumed: 0,
				included: 2500,
				period: 'total',
				unit: 'events',
				unlimited: false,
			},
		]);
	});

	it('consumes only the latest month for a monthly period', () => {
		mockProjectId('PRJCT-1');

		mockFetch({
			'/o/c/entitlements': [toEntitlement(1, 10, {quantity: 100})],
			'/o/c/usagedefinitions': [{id: 10, period: 'per month'}],
			'/o/c/usageevents': [
				toEvent(1, 5, '2026-08-03T00:00:00Z'),
				toEvent(1, 7, '2026-09-01T00:00:00Z'),
				toEvent(1, 4, '2026-09-20T00:00:00Z'),
				toEvent(1, 50),
			],
		});

		const {result} = renderHook(() => useProjectUsage());

		expect(result.current.usage[0].consumed).toBe(11);
	});

	it('does not request anything without a project id', () => {
		mockProjectId('');

		mockFetch({});

		const {result} = renderHook(() => useProjectUsage());

		expect(getRequestedURLs().every((url) => url === null)).toBe(true);
		expect(result.current.usage).toEqual([]);
	});

	it('does not request anything for the unassigned project', () => {
		mockProjectId(ONE_TIME_PURCHASES);

		mockFetch({});

		renderHook(() => useProjectUsage());

		expect(getRequestedURLs().every((url) => url === null)).toBe(true);
	});

	it('filters entitlements by the project external reference code', () => {
		mockProjectId('PRJCT-1');

		mockFetch({});

		renderHook(() => useProjectUsage());

		expect(useFetch).toHaveBeenCalledWith('/o/c/entitlements', {
			params: expect.objectContaining({
				filter: "r_projectToEntitlement_c_projectERC eq 'PRJCT-1'",
			}),
		});
	});

	it('marks the usage unlimited when any entitlement has the unlimited grant type', () => {
		mockProjectId('PRJCT-1');

		mockFetch({
			'/o/c/entitlements': [
				toEntitlement(1, 10, {quantity: 10}),
				toEntitlement(2, 10, {grantType: 'unlimited'}),
			],
			'/o/c/usagedefinitions': [{id: 10}],
			'/o/c/usageevents': [],
		});

		const {result} = renderHook(() => useProjectUsage());

		expect(result.current.usage[0]).toMatchObject({
			included: 10,
			period: '',
			unit: '',
			unlimited: true,
		});
	});

	it('skips overage bucket entitlements and entitlements without a usage definition', () => {
		mockProjectId('PRJCT-1');

		mockFetch({
			'/o/c/entitlements': [
				toEntitlement(1, 10, {quantity: 100}),
				toEntitlement(2, 10, {
					name: 'events-overage-bucket',
					quantity: 9,
				}),
				toEntitlement(3, undefined, {quantity: 9}),
			],
			'/o/c/usagedefinitions': [{id: 10}, {id: 20}],
			'/o/c/usageevents': [toEvent(1, 3), toEvent(2, 40), toEvent(3, 40)],
		});

		const {result} = renderHook(() => useProjectUsage());

		expect(result.current.usage).toEqual([
			{
				consumed: 3,
				included: 100,
				period: '',
				unit: '',
				unlimited: false,
			},
		]);

		expect(useFetch).toHaveBeenCalledWith('/o/c/usageevents', {
			params: {
				filter: "r_entitlementToUsageEvent_c_entitlementId eq '1'",
				pageSize: 500,
			},
		});
	});

	it('sums every event for a period that is not monthly', () => {
		mockProjectId('PRJCT-1');

		mockFetch({
			'/o/c/entitlements': [
				toEntitlement(1, 10, {quantity: 100}),
				toEntitlement(2, 10, {quantity: 50}),
			],
			'/o/c/usagedefinitions': [{id: 10, period: 'per year'}],
			'/o/c/usageevents': [
				toEvent(1, 5, '2026-08-03T00:00:00Z'),
				toEvent(2, 7, '2026-09-01T00:00:00Z'),
				toEvent(1, 4),
			],
		});

		const {result} = renderHook(() => useProjectUsage());

		expect(result.current.usage[0]).toMatchObject({
			consumed: 16,
			included: 150,
		});
	});
});
