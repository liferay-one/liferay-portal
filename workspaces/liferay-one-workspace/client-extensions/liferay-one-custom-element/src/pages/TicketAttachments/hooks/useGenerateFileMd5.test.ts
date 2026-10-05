/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {generateFileMd5} from '~/pages/TicketAttachments/utils/generateFileMd5';

import useGenerateFileMd5 from './useGenerateFileMd5';

vi.mock('~/pages/TicketAttachments/utils/generateFileMd5', () => ({
	generateFileMd5: vi.fn(),
}));

const params = {file: new File(['log'], 'server.log'), ticketId: 'LRSD-1'};

describe('[HOOK-TICKETATTACHMENTS-USEGENERATEFILEMD5] useGenerateFileMd5', () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('returns the hash and stores it in state on success', async () => {
		vi.mocked(generateFileMd5).mockResolvedValue('md5-abc');

		const {result} = renderHook(() => useGenerateFileMd5());

		let response;

		await act(async () => {
			response = await result.current.generateMd5(params);
		});

		expect(response).toEqual({hash: 'md5-abc', success: true});
		expect(generateFileMd5).toHaveBeenCalledWith(params.file);
		expect(result.current.md5).toBe('md5-abc');
		expect(result.current.loading).toBe(false);
	});

	it('returns failure and clears the hash when the run is aborted', async () => {
		let resolveHash: (hash: string) => void = () => {};

		vi.mocked(generateFileMd5).mockReturnValue(
			new Promise((resolve) => {
				resolveHash = resolve;
			})
		);

		const {result} = renderHook(() => useGenerateFileMd5());

		let pending: ReturnType<typeof result.current.generateMd5> =
			Promise.resolve({success: true});

		act(() => {
			pending = result.current.generateMd5(params);
		});

		expect(result.current.loading).toBe(true);

		act(() => result.current.abortGenerateMd5());

		expect(result.current.loading).toBe(false);

		let response;

		await act(async () => {
			resolveHash('md5-abc');

			response = await pending;
		});

		expect(response).toEqual({success: false});
		expect(result.current.md5).toBeNull();
		expect(result.current.loading).toBe(false);
	});

	it('signals abort on the pending run controller when a new run starts', async () => {
		vi.mocked(generateFileMd5).mockReturnValue(new Promise(() => {}));

		const abort = vi.spyOn(AbortController.prototype, 'abort');

		const {result} = renderHook(() => useGenerateFileMd5());

		act(() => {
			result.current.generateMd5(params);
		});

		expect(abort).not.toHaveBeenCalled();

		act(() => {
			result.current.generateMd5(params);
		});

		expect(abort).toHaveBeenCalledTimes(1);
	});

	it('does nothing on abort when no run is pending', () => {
		const {result} = renderHook(() => useGenerateFileMd5());

		act(() => result.current.abortGenerateMd5());

		expect(result.current).toEqual(
			expect.objectContaining({loading: false, md5: null})
		);
	});
});
