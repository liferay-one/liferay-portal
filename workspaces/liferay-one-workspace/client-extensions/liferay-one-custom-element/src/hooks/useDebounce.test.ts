/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import useDebounce from './useDebounce';

describe('[HOOK-USEDEBOUNCE] useDebounce', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('updates the value only after the delay', () => {
		const {rerender, result} = renderHook(
			({value}) => useDebounce(value, 300),
			{initialProps: {value: 'a'}}
		);

		rerender({value: 'b'});

		act(() => vi.advanceTimersByTime(299));

		expect(result.current).toBe('a');

		act(() => vi.advanceTimersByTime(1));

		expect(result.current).toBe('b');
	});

	it('restarts the timer on a change inside the delay', () => {
		const {rerender, result} = renderHook(
			({value}) => useDebounce(value, 300),
			{initialProps: {value: 'a'}}
		);

		rerender({value: 'b'});

		act(() => vi.advanceTimersByTime(200));

		rerender({value: 'c'});

		act(() => vi.advanceTimersByTime(200));

		expect(result.current).toBe('a');

		act(() => vi.advanceTimersByTime(100));

		expect(result.current).toBe('c');
	});

	it('defaults the delay to 500 ms', () => {
		const {rerender, result} = renderHook(({value}) => useDebounce(value), {
			initialProps: {value: 'a'},
		});

		rerender({value: 'b'});

		act(() => vi.advanceTimersByTime(499));

		expect(result.current).toBe('a');

		act(() => vi.advanceTimersByTime(1));

		expect(result.current).toBe('b');
	});

	it('clears the pending timeout on unmount', () => {
		const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

		const {rerender, unmount} = renderHook(
			({value}) => useDebounce(value, 300),
			{initialProps: {value: 'a'}}
		);

		rerender({value: 'b'});

		clearTimeoutSpy.mockClear();

		unmount();

		expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});
});
