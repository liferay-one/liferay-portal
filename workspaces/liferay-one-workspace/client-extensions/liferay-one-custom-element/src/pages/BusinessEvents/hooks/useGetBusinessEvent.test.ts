/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {useNavigate} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';
import {getBusinessEventById} from '~/services/spring-boot/Jira';

import useGetBusinessEvent from './useGetBusinessEvent';

const {navigate} = vi.hoisted(() => ({navigate: vi.fn()}));

vi.mock('react-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('react-router')>()),
	useNavigate: vi.fn(),
}));

vi.mock('~/services/spring-boot/Jira', () => ({
	getBusinessEventById: vi.fn(),
}));

describe('[HOOK-BUSINESSEVENTS-USEGETBUSINESSEVENT] useGetBusinessEvent', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useNavigate).mockReturnValue(navigate);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('loads the business event by ID and project ERC', async () => {
		const businessEvent = {id: 'BE-1'};

		vi.mocked(getBusinessEventById).mockResolvedValue(businessEvent);

		const {result} = renderHook(() =>
			useGetBusinessEvent('BE-1', 'PRJCT-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(getBusinessEventById).toHaveBeenCalledWith('BE-1', 'PRJCT-1');
		expect(result.current.businessEvent).toEqual(businessEvent);
	});

	it('skips the fetch when the project ERC is empty', async () => {
		const {result} = renderHook(() => useGetBusinessEvent('BE-1', ''));

		await Promise.resolve();

		expect(getBusinessEventById).not.toHaveBeenCalled();
		expect(result.current.businessEvent).toBeUndefined();
	});

	it('stays loading without fetching when the ID is missing', async () => {
		const {result} = renderHook(() => useGetBusinessEvent('', 'PRJCT-1'));

		await Promise.resolve();

		expect(getBusinessEventById).not.toHaveBeenCalled();
		expect(result.current.loading).toBe(true);
	});

	it('shows a danger toast and navigates back to the list on failure', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');

		vi.mocked(getBusinessEventById).mockRejectedValue(new Error('failed'));

		const {result} = renderHook(() =>
			useGetBusinessEvent('BE-1', 'PRJCT-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(openToast).toHaveBeenCalledWith({
			message: 'An unexpected error occurred.',
			type: 'danger',
		});
		expect(navigate).toHaveBeenCalledWith('/PRJCT-1/business-events');
		expect(result.current.businessEvent).toBeUndefined();
	});
});
