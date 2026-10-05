/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {createElement} from 'react';
import {SWRConfig} from 'swr';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import Cloud from '~/services/spring-boot/Cloud';

import {useHasDisasterRecoveryEntitlement} from './useHasDisasterRecoveryEntitlement';

import type {ReactNode} from 'react';

vi.mock('~/services/spring-boot/Cloud', () => ({
	default: {
		getProjectsEntitlementsDisasterRecovery: vi.fn(),
	},
}));

const mockedGetProjectsEntitlementsDisasterRecovery = vi.mocked(
	Cloud.getProjectsEntitlementsDisasterRecovery
);

function wrapper({children}: {children: ReactNode}) {
	return createElement(
		SWRConfig,
		{value: {dedupingInterval: 0, provider: () => new Map()}},
		children
	);
}

describe('[HOOK-MYACCOUNT-PROJECTS-USEHASDISASTERRECOVERYENTITLEMENT] useHasDisasterRecoveryEntitlement', () => {
	beforeEach(() => {
		mockedGetProjectsEntitlementsDisasterRecovery.mockReset();
	});

	it('skips the request without a project external reference code', async () => {
		const {result} = renderHook(
			() => useHasDisasterRecoveryEntitlement(''),
			{wrapper}
		);

		await act(async () => {});

		expect(
			mockedGetProjectsEntitlementsDisasterRecovery
		).not.toHaveBeenCalled();
		expect(result.current).toEqual({
			hasDisasterRecoveryEntitlement: false,
			loading: false,
		});
	});

	it('defaults to false while no data has loaded', () => {
		mockedGetProjectsEntitlementsDisasterRecovery.mockReturnValue(
			new Promise(() => {})
		);

		const {result} = renderHook(
			() => useHasDisasterRecoveryEntitlement('PRJCT-1'),
			{wrapper}
		);

		expect(result.current).toEqual({
			hasDisasterRecoveryEntitlement: false,
			loading: true,
		});
	});

	it('returns the entitlement flag from the cloud service', async () => {
		mockedGetProjectsEntitlementsDisasterRecovery.mockResolvedValue({
			hasDisasterRecoveryEntitlement: true,
		});

		const {result} = renderHook(
			() => useHasDisasterRecoveryEntitlement('PRJCT-1'),
			{wrapper}
		);

		await waitFor(() =>
			expect(result.current.hasDisasterRecoveryEntitlement).toBe(true)
		);

		expect(
			mockedGetProjectsEntitlementsDisasterRecovery
		).toHaveBeenCalledWith('PRJCT-1');
		expect(result.current.loading).toBe(false);
	});

	it('defaults to false when the response has no flag', async () => {
		mockedGetProjectsEntitlementsDisasterRecovery.mockResolvedValue(
			{} as {hasDisasterRecoveryEntitlement: boolean}
		);

		const {result} = renderHook(
			() => useHasDisasterRecoveryEntitlement('PRJCT-2'),
			{wrapper}
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.hasDisasterRecoveryEntitlement).toBe(false);
	});
});
