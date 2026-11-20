/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useDXPActivationCodes} from './useDXPActivationCodes';

const mocks = vi.hoisted(() => ({
	getDXPActivationCodes: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/services/spring-boot/Projects', () => ({
	default: {
		getDXPActivationCodes: mocks.getDXPActivationCodes,
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

describe('[HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY-USEDXPACTIVATIONCODES] useDXPActivationCodes', () => {
	beforeEach(() => {
		mocks.getDXPActivationCodes.mockReset();
		mocks.useSWR.mockReset();
	});

	it('keys the request on the project and fetches its activation codes', () => {
		mockSWR(undefined);

		renderHook(() => useDXPActivationCodes('PRJCT-1'));

		expect(mocks.useSWR.mock.calls[0][0]).toBe(
			'/projects/PRJCT-1/dxp/activation-codes'
		);

		mocks.useSWR.mock.calls[0][1]();

		expect(mocks.getDXPActivationCodes).toHaveBeenCalledWith('PRJCT-1');
	});

	it('skips the request without a project external reference code', () => {
		mockSWR(undefined);

		const {result} = renderHook(() => useDXPActivationCodes(''));

		expect(mocks.useSWR.mock.calls[0][0]).toBeNull();
		expect(result.current.environmentTypes).toEqual([]);
	});

	it('sorts production, non-production, and backup first without changing the cached data', () => {
		const environmentTypes = [
			{type: 'backup'},
			{type: 'unknown'},
			{type: 'non-production'},
			{type: 'production'},
		];

		mockSWR({environmentTypes});

		const {result} = renderHook(() => useDXPActivationCodes('PRJCT-1'));

		expect(
			result.current.environmentTypes.map(
				(environmentType) => environmentType.type
			)
		).toEqual(['production', 'non-production', 'backup', 'unknown']);
		expect(environmentTypes.map(({type}) => type)).toEqual([
			'backup',
			'unknown',
			'non-production',
			'production',
		]);
	});
});
