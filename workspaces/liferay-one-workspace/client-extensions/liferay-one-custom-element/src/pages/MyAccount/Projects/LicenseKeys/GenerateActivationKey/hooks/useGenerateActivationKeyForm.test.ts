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

const ACCOUNT_1 = {accountExternalReferenceCode: 'ACCNT-1'};

const PRODUCT_COMMERCE = {
	externalReferenceCode: 'PRDCT-COMMERCE',
	licenseKeyFamily: 'CMP',
};

const PRODUCT_DXP = {
	externalReferenceCode: 'PRDCT-DXP',
	licenseKeyFamily: 'DXP',
};

const PRODUCT_PORTAL = {
	externalReferenceCode: 'PRDCT-PORTAL',
	licenseKeyFamily: 'Portal',
};

const PROJECT_1 = {projectExternalReferenceCode: 'PRJCT-1'};

const PROJECT_2 = {projectExternalReferenceCode: 'PRJCT-2'};

describe('[HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY-USEGENERATEACTIVATIONKEYFORM] useGenerateActivationKeyForm', () => {
	beforeEach(() => {
		mocks.getGenerateForm.mockReset();
	});

	it('sets the error and stops loading without a scope', () => {
		const {result} = renderHook(() => useGenerateActivationKeyForm());

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
			useGenerateActivationKeyForm(PROJECT_1, 'KEY-1')
		);

		expect(result.current.loading).toBe(true);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(mocks.getGenerateForm).toHaveBeenCalledWith(PROJECT_1, 'KEY-1');
		expect(result.current).toEqual({
			error: false,
			generateForm: {products: []},
			loading: false,
		});
	});

	it('passes undefined when the renewed key external reference code is null', async () => {
		mocks.getGenerateForm.mockResolvedValue({products: []});

		const {result} = renderHook(() =>
			useGenerateActivationKeyForm(PROJECT_1, null)
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(mocks.getGenerateForm).toHaveBeenCalledWith(
			PROJECT_1,
			undefined
		);
	});

	it('keeps only the leading product of a new key', async () => {
		mocks.getGenerateForm.mockResolvedValue({
			bundleProducts: [],
			products: [PRODUCT_COMMERCE, PRODUCT_PORTAL, PRODUCT_DXP],
		});

		const {result} = renderHook(() =>
			useGenerateActivationKeyForm(PROJECT_1)
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.generateForm?.products).toEqual([PRODUCT_DXP]);
	});

	it('keeps every product of the account form', async () => {
		const products = [PRODUCT_COMMERCE, PRODUCT_PORTAL, PRODUCT_DXP];

		mocks.getGenerateForm.mockResolvedValue({bundleProducts: [], products});

		const {result} = renderHook(() =>
			useGenerateActivationKeyForm(ACCOUNT_1)
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.generateForm?.products).toEqual(products);
	});

	it('leaves the apps out of the account form unless one is preselected', async () => {
		const app = {
			app: true,
			externalReferenceCode: 'PRDCT-APP',
			licenseKeyFamily: '',
		};

		mocks.getGenerateForm.mockResolvedValue({
			bundleProducts: [],
			products: [app, PRODUCT_DXP],
		});

		const {result: newKeyResult} = renderHook(() =>
			useGenerateActivationKeyForm(ACCOUNT_1)
		);

		await waitFor(() => expect(newKeyResult.current.loading).toBe(false));

		expect(newKeyResult.current.generateForm?.products).toEqual([
			PRODUCT_DXP,
		]);

		const {result: preselectedResult} = renderHook(() =>
			useGenerateActivationKeyForm(ACCOUNT_1, null, 'PRDCT-APP')
		);

		await waitFor(() =>
			expect(preselectedResult.current.loading).toBe(false)
		);

		expect(preselectedResult.current.generateForm?.products).toEqual([app]);
	});

	it('keeps every product of a renewed key', async () => {
		const products = [PRODUCT_COMMERCE, PRODUCT_PORTAL, PRODUCT_DXP];

		mocks.getGenerateForm.mockResolvedValue({bundleProducts: [], products});

		const {result} = renderHook(() =>
			useGenerateActivationKeyForm(PROJECT_1, 'KEY-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.generateForm?.products).toEqual(products);
	});

	it('sets the error when the request fails', async () => {
		mocks.getGenerateForm.mockRejectedValue(new Error('failed'));

		const {result} = renderHook(() =>
			useGenerateActivationKeyForm(PROJECT_1)
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBe(true);
		expect(result.current.generateForm).toBeUndefined();
	});

	it('loads the generate form of the account', async () => {
		mocks.getGenerateForm.mockResolvedValue({products: []});

		const scope = {accountExternalReferenceCode: 'ACCNT-1'};

		const {result} = renderHook(() => useGenerateActivationKeyForm(scope));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(mocks.getGenerateForm).toHaveBeenCalledWith(scope, undefined);
	});

	it('ignores a late result after the argument changes', async () => {
		const first = deferred<object>();
		const second = deferred<object>();

		mocks.getGenerateForm
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);

		const {rerender, result} = renderHook(
			({scope}) => useGenerateActivationKeyForm(scope),
			{initialProps: {scope: PROJECT_1}}
		);

		rerender({scope: PROJECT_2});

		await act(async () => {
			second.resolve({name: 'second', products: []});
		});

		await act(async () => {
			first.resolve({name: 'first', products: []});
		});

		expect(result.current.generateForm).toEqual({
			name: 'second',
			products: [],
		});
		expect(result.current.loading).toBe(false);
	});
});
