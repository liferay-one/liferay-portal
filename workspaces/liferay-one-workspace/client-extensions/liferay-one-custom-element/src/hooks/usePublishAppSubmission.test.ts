/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {useNavigate} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useMarketplaceContext} from '~/context/MarketplaceContextProvider';
import {NewAppInitialState, NewAppTypes} from '~/context/NewAppContextProvider';
import {PublishMode} from '~/pages/PublisherDashboard/pages/NewAppFlow/constants';
import {Liferay} from '~/services/liferay/liferay';

import usePublishAppSubmission from './usePublishAppSubmission';

const {AppPublish, navigate, sync} = vi.hoisted(() => {
	const sync = vi.fn();

	return {
		AppPublish: vi.fn(function (this: {sync: unknown}) {
			this.sync = sync;
		}),
		navigate: vi.fn(),
		sync,
	};
});

vi.mock('react-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('react-router')>()),
	useNavigate: vi.fn(),
}));

vi.mock('~/context/MarketplaceContextProvider', () => ({
	useMarketplaceContext: vi.fn(),
}));

vi.mock('~/services/actions/AppPublish', () => ({
	default: AppPublish,
}));

const properties = {marketplaceSiteGroupId: '20'};

function appContext(product?: {productStatus: number}) {
	return {
		_product: product,
		profile: {name: 'My App'},
	} as unknown as NewAppInitialState;
}

describe('[HOOK-USEPUBLISHAPPSUBMISSION] usePublishAppSubmission', () => {
	beforeEach(() => {
		vi.mocked(useNavigate).mockReturnValue(navigate);
		vi.mocked(useMarketplaceContext).mockReturnValue({
			properties,
		} as unknown as ReturnType<typeof useMarketplaceContext>);
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('toggles loading around the sync and stores the product on success', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');
		const dispatch = vi.fn();
		const context = appContext();

		sync.mockResolvedValue({productId: 1});

		const {result} = renderHook(() =>
			usePublishAppSubmission(context, dispatch)
		);

		await result.current.onSave();

		expect(AppPublish).toHaveBeenCalledWith(context);
		expect(sync).toHaveBeenCalledWith({
			isDraft: false,
			isEdit: false,
			properties,
		});
		expect(dispatch.mock.calls).toEqual([
			[{payload: true, type: NewAppTypes.SET_LOADING}],
			[{payload: {productId: 1}, type: NewAppTypes.SET_PRODUCT}],
			[{payload: false, type: NewAppTypes.SET_LOADING}],
		]);
		expect(openToast).toHaveBeenCalledWith({
			message: 'App <b>My App</b> submitted.',
			title: '',
			type: 'info',
		});
		expect(navigate).not.toHaveBeenCalled();
	});

	it('shows a danger toast, clears loading, and rethrows when the sync fails', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');
		const dispatch = vi.fn();
		const error = new Error('sync failed');

		sync.mockRejectedValue(error);

		const {result} = renderHook(() =>
			usePublishAppSubmission(appContext(), dispatch)
		);

		await expect(result.current.onSave()).rejects.toBe(error);

		expect(dispatch.mock.calls).toEqual([
			[{payload: true, type: NewAppTypes.SET_LOADING}],
			[{payload: false, type: NewAppTypes.SET_LOADING}],
		]);
		expect(openToast).toHaveBeenCalledTimes(1);
		expect(openToast).toHaveBeenCalledWith({
			message: 'An unexpected error occurred.',
			type: 'danger',
		});
	});

	it('saves as a draft and navigates home', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');

		sync.mockResolvedValue({productId: 1});

		const {result} = renderHook(() =>
			usePublishAppSubmission(appContext(), vi.fn())
		);

		await result.current.onSaveAsDraft();

		expect(sync).toHaveBeenCalledWith({isDraft: true, properties});
		expect(openToast).toHaveBeenCalledWith({
			message: '<b>My App</b> saved as a <b>draft</b> successfully',
			type: 'info',
		});
		expect(navigate).toHaveBeenCalledWith('/');
	});

	it('does not navigate when saving a draft fails', async () => {
		vi.spyOn(Liferay.Util, 'openToast');

		sync.mockRejectedValue(new Error('sync failed'));

		const {result} = renderHook(() =>
			usePublishAppSubmission(appContext(), vi.fn())
		);

		await expect(result.current.onSaveAsDraft()).rejects.toThrow();

		expect(navigate).not.toHaveBeenCalled();
	});

	it.each([
		['a non draft product', {productStatus: 0}, PublishMode.EDIT, true],
		['a draft product', {productStatus: 2}, PublishMode.EDIT, false],
		[
			'the new version mode',
			{productStatus: 0},
			PublishMode.NEW_VERSION,
			false,
		],
		['no product', undefined, PublishMode.CREATE, false],
	])('sets isEdit for %s to %s', async (_label, product, mode, isEdit) => {
		vi.spyOn(Liferay.Util, 'openToast');

		sync.mockResolvedValue({productId: 1});

		const {result} = renderHook(() =>
			usePublishAppSubmission(appContext(product), vi.fn(), mode)
		);

		await result.current.onSave();

		expect(sync).toHaveBeenCalledWith(
			expect.objectContaining({isDraft: false, isEdit})
		);
	});
});
