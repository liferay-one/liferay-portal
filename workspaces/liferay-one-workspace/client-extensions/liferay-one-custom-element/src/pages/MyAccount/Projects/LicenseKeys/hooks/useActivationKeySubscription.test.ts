/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useActivationKeySubscription} from './useActivationKeySubscription';

const mocks = vi.hoisted(() => ({
	getSubscription: vi.fn(),
	subscribe: vi.fn(),
	unsubscribe: vi.fn(),
}));

vi.mock('~/services/spring-boot/ActivationKeys', () => ({
	default: {
		getSubscription: mocks.getSubscription,
		subscribe: mocks.subscribe,
		unsubscribe: mocks.unsubscribe,
	},
}));

describe('[HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-USEACTIVATIONKEYSUBSCRIPTION] useActivationKeySubscription', () => {
	beforeEach(() => {
		mocks.getSubscription.mockReset();
		mocks.subscribe.mockReset();
		mocks.unsubscribe.mockReset();
	});

	it('loads the subscribed state', async () => {
		mocks.getSubscription.mockResolvedValue(true);

		const {result} = renderHook(() =>
			useActivationKeySubscription('KEY-1')
		);

		expect(result.current.loading).toBe(true);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.subscribed).toBe(true);
		expect(mocks.getSubscription).toHaveBeenCalledWith('KEY-1');
	});

	it('falls back to false when the subscription request fails', async () => {
		mocks.getSubscription.mockRejectedValue(new Error('failed'));

		const {result} = renderHook(() =>
			useActivationKeySubscription('KEY-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.subscribed).toBe(false);
	});

	it('ignores a stale result after the activation key changes', async () => {
		let resolveSubscription: (value: boolean) => void = () => {};

		mocks.getSubscription.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveSubscription = resolve;
			})
		);
		mocks.getSubscription.mockResolvedValueOnce(false);

		const {rerender, result} = renderHook(
			({activationKeyId}) =>
				useActivationKeySubscription(activationKeyId),
			{initialProps: {activationKeyId: 'KEY-1'}}
		);

		rerender({activationKeyId: 'KEY-2'});

		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			resolveSubscription(true);
		});

		expect(mocks.getSubscription).toHaveBeenLastCalledWith('KEY-2');
		expect(result.current).toMatchObject({
			loading: false,
			subscribed: false,
		});
	});

	it('subscribes optimistically before the request resolves', async () => {
		let resolveSubscribe: () => void = () => {};

		mocks.getSubscription.mockResolvedValue(false);
		mocks.subscribe.mockReturnValue(
			new Promise<void>((resolve) => {
				resolveSubscribe = resolve;
			})
		);

		const {result} = renderHook(() =>
			useActivationKeySubscription('KEY-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		let toggled: Promise<void> = Promise.resolve();

		act(() => {
			toggled = result.current.toggleSubscription(true);
		});

		expect(mocks.subscribe).toHaveBeenCalledWith('KEY-1');
		expect(result.current.subscribed).toBe(true);

		await act(async () => {
			resolveSubscribe();

			await toggled;
		});

		expect(result.current.subscribed).toBe(true);
	});

	it('reverts when subscribe fails', async () => {
		mocks.getSubscription.mockResolvedValue(false);
		mocks.subscribe.mockRejectedValue(new Error('failed'));

		const {result} = renderHook(() =>
			useActivationKeySubscription('KEY-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			await result.current.toggleSubscription(true);
		});

		expect(result.current.subscribed).toBe(false);
	});

	it('reverts when unsubscribe fails', async () => {
		mocks.getSubscription.mockResolvedValue(true);
		mocks.unsubscribe.mockRejectedValue(new Error('failed'));

		const {result} = renderHook(() =>
			useActivationKeySubscription('KEY-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			await result.current.toggleSubscription(false);
		});

		expect(mocks.unsubscribe).toHaveBeenCalledWith('KEY-1');
		expect(mocks.subscribe).not.toHaveBeenCalled();
		expect(result.current.subscribed).toBe(true);
	});
});
