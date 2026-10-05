/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {useNavigate} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useMarketplaceContext} from '~/context/MarketplaceContextProvider';
import {
	SolutionInitialState,
	SolutionTypes,
} from '~/context/SolutionContextProvider';
import {Liferay} from '~/services/liferay/liferay';

import usePublishSolutionSubmission from './usePublishSolutionSubmission';

const {SolutionPublish, navigate, sync} = vi.hoisted(() => {
	const sync = vi.fn();

	return {
		SolutionPublish: vi.fn(function (this: {sync: unknown}) {
			this.sync = sync;
		}),
		navigate: vi.fn(),
		sync,
	};
});

vi.mock('react-router-dom', async (importOriginal) => ({
	...(await importOriginal<typeof import('react-router-dom')>()),
	useNavigate: vi.fn(),
}));

vi.mock('~/context/MarketplaceContextProvider', () => ({
	useMarketplaceContext: vi.fn(),
}));

vi.mock('~/services/actions/SolutionPublish', () => ({
	default: SolutionPublish,
}));

const context = {
	profile: {name: 'My Solution'},
} as unknown as SolutionInitialState;

function mockUserAccount(myUserAccount?: {name: string}) {
	vi.mocked(useMarketplaceContext).mockReturnValue({
		myUserAccount,
	} as unknown as ReturnType<typeof useMarketplaceContext>);
}

describe('[HOOK-USEPUBLISHSOLUTIONSUBMISSION] usePublishSolutionSubmission', () => {
	beforeEach(() => {
		vi.mocked(useNavigate).mockReturnValue(navigate);
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('toggles loading around the sync and sends the editor name from the user account', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');
		const dispatch = vi.fn();

		mockUserAccount({name: 'Jane Doe'});

		sync.mockResolvedValue({productId: 1});

		const {result} = renderHook(() =>
			usePublishSolutionSubmission(context, dispatch)
		);

		await result.current.onSave();

		expect(SolutionPublish).toHaveBeenCalledWith(context);
		expect(sync).toHaveBeenCalledWith({
			editorName: 'Jane Doe',
			isDraft: false,
		});
		expect(dispatch.mock.calls).toEqual([
			[{payload: true, type: SolutionTypes.SET_LOADING}],
			[{payload: {productId: 1}, type: SolutionTypes.SET_PRODUCT}],
			[{payload: false, type: SolutionTypes.SET_LOADING}],
		]);
		expect(openToast).toHaveBeenCalledWith({
			message: 'Solution <b>My Solution</b> submitted.',
			title: '',
			type: 'info',
		});
		expect(navigate).not.toHaveBeenCalled();
	});

	it('sends an empty editor name when the user account is missing', async () => {
		vi.spyOn(Liferay.Util, 'openToast');

		mockUserAccount(undefined);

		sync.mockResolvedValue({productId: 1});

		const {result} = renderHook(() =>
			usePublishSolutionSubmission(context, vi.fn())
		);

		await result.current.onSave();

		expect(sync).toHaveBeenCalledWith({editorName: '', isDraft: false});
	});

	it('shows a danger toast, clears loading, and rethrows when the sync fails', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');
		const dispatch = vi.fn();
		const error = new Error('sync failed');

		mockUserAccount({name: 'Jane Doe'});

		sync.mockRejectedValue(error);

		const {result} = renderHook(() =>
			usePublishSolutionSubmission(context, dispatch)
		);

		await expect(result.current.onSaveAsDraft()).rejects.toBe(error);

		expect(dispatch.mock.calls).toEqual([
			[{payload: true, type: SolutionTypes.SET_LOADING}],
			[{payload: false, type: SolutionTypes.SET_LOADING}],
		]);
		expect(openToast).toHaveBeenCalledTimes(1);
		expect(openToast).toHaveBeenCalledWith({
			message: 'An unexpected error occurred.',
			type: 'danger',
		});
		expect(navigate).not.toHaveBeenCalled();
	});

	it('saves as a draft and navigates to the solutions exit link', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');

		mockUserAccount({name: 'Jane Doe'});

		sync.mockResolvedValue({productId: 1});

		const {result} = renderHook(() =>
			usePublishSolutionSubmission(context, vi.fn())
		);

		await result.current.onSaveAsDraft();

		expect(sync).toHaveBeenCalledWith({
			editorName: 'Jane Doe',
			isDraft: true,
		});
		expect(openToast).toHaveBeenCalledWith({
			message: '<b>My Solution</b> saved as a <b>draft</b> successfully',
			type: 'info',
		});
		expect(navigate).toHaveBeenCalledWith('/published-solutions');
	});
});
