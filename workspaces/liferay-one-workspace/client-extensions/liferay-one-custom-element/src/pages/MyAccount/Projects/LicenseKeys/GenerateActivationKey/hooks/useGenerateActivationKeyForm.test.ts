/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useGenerateActivationKeyForm} from './useGenerateActivationKeyForm';

const mocks = vi.hoisted(() => ({
	getGenerateForm: vi.fn(),
}));

vi.mock('~/services/spring-boot/ActivationKeys', () => ({
	default: {getGenerateForm: mocks.getGenerateForm},
}));

function deferred<T>() {
	let resolve: (value: T) => void = () => {};

	const promise = new Promise<T>((resolvePromise) => {
		resolve = resolvePromise;
	});

	return {promise, resolve};
}

describe('[HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY-USEGENERATEACTIVATIONKEYFORM] useGenerateActivationKeyForm', () => {
	beforeEach(() => {
		mocks.getGenerateForm.mockReset();
	});

	it('sets the error and stops loading without a project external reference code', () => {
		const {result} = renderHook(() => useGenerateActivationKeyForm(''));

		expect(result.current).toEqual({
			error: true,
			generateForm: undefined,
			loading: false,
		});
		expect(mocks.getGenerateForm).not.toHaveBeenCalled();
	});

	it('loads the generate form with the renewed key external reference code', async () => {
		mocks.getGenerateForm.mockResolvedValue({products: []});

		const {result} = renderHook(() =>
			useGenerateActivationKeyForm('PRJCT-1', 'KEY-1')
		);

		expect(result.current.loading).toBe(true);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(mocks.getGenerateForm).toHaveBeenCalledWith('PRJCT-1', 'KEY-1');
		expect(result.current).toEqual({
			error: false,
			generateForm: {products: []},
			loading: false,
		});
	});

	it('passes undefined when the renewed key external reference code is null', async () => {
		mocks.getGenerateForm.mockResolvedValue({});

		const {result} = renderHook(() =>
			useGenerateActivationKeyForm('PRJCT-1', null)
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(mocks.getGenerateForm).toHaveBeenCalledWith(
			'PRJCT-1',
			undefined
		);
	});

	it('sets the error when the request fails', async () => {
		mocks.getGenerateForm.mockRejectedValue(new Error('failed'));

		const {result} = renderHook(() =>
			useGenerateActivationKeyForm('PRJCT-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBe(true);
		expect(result.current.generateForm).toBeUndefined();
	});

	it('ignores a late result after the argument changes', async () => {
		const first = deferred<object>();
		const second = deferred<object>();

		mocks.getGenerateForm
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);

		const {rerender, result} = renderHook(
			({projectExternalReferenceCode}) =>
				useGenerateActivationKeyForm(projectExternalReferenceCode),
			{initialProps: {projectExternalReferenceCode: 'PRJCT-1'}}
		);

		rerender({projectExternalReferenceCode: 'PRJCT-2'});

		await act(async () => {
			second.resolve({name: 'second'});
		});

		await act(async () => {
			first.resolve({name: 'first'});
		});

		expect(result.current.generateForm).toEqual({name: 'second'});
		expect(result.current.loading).toBe(false);
	});
});
