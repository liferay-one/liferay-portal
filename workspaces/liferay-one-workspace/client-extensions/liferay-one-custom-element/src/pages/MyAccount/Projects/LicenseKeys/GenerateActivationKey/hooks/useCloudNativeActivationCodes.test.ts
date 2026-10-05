/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useCloudNativeActivationCodes} from './useCloudNativeActivationCodes';

const mocks = vi.hoisted(() => ({
	getProjectsEnvironmentsActivationCodes: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/services/spring-boot/Cloud', () => ({
	default: {
		getProjectsEnvironmentsActivationCodes:
			mocks.getProjectsEnvironmentsActivationCodes,
	},
}));

function mockSWR(data: unknown) {
	mocks.useSWR.mockReturnValue({
		data,
		error: undefined,
		isLoading: false,
		mutate: vi.fn(),
	});
}

describe('[HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY-USECLOUDNATIVEACTIVATIONCODES] useCloudNativeActivationCodes', () => {
	beforeEach(() => {
		mocks.getProjectsEnvironmentsActivationCodes.mockReset();
		mocks.useSWR.mockReset();
	});

	it('keys the request on the project and fetches its activation codes', () => {
		mockSWR(undefined);

		renderHook(() => useCloudNativeActivationCodes('PRJCT-1'));

		expect(mocks.useSWR.mock.calls[0][0]).toBe(
			'/cloud/projects/PRJCT-1/environments/activation-codes'
		);

		mocks.useSWR.mock.calls[0][1]();

		expect(
			mocks.getProjectsEnvironmentsActivationCodes
		).toHaveBeenCalledWith('PRJCT-1');
	});

	it('skips the request without a project external reference code', () => {
		mockSWR(undefined);

		renderHook(() => useCloudNativeActivationCodes(''));

		expect(mocks.useSWR.mock.calls[0][0]).toBeNull();
	});

	it('sorts the environment types by rank without mutating the cached data', () => {
		const environmentTypes = [
			{type: 'sandbox'},
			{type: 'non-production'},
			{type: 'production'},
			{type: 'uat'},
		];

		mockSWR({environmentTypes});

		const {result} = renderHook(() =>
			useCloudNativeActivationCodes('PRJCT-1')
		);

		expect(result.current.environmentTypes.map(({type}) => type)).toEqual([
			'production',
			'uat',
			'non-production',
			'sandbox',
		]);
		expect(environmentTypes.map(({type}) => type)).toEqual([
			'sandbox',
			'non-production',
			'production',
			'uat',
		]);
	});

	it('returns a stable empty list when there is no data', () => {
		mockSWR(undefined);

		const {rerender, result} = renderHook(() =>
			useCloudNativeActivationCodes('PRJCT-1')
		);

		const firstEnvironmentTypes = result.current.environmentTypes;

		rerender();

		expect(firstEnvironmentTypes).toEqual([]);
		expect(result.current.environmentTypes).toBe(firstEnvironmentTypes);
	});
});
