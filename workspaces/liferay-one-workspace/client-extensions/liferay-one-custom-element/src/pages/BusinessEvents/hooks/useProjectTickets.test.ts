/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {IBusinessEvent} from '~/pages/BusinessEvents/types';
import {getProjectTickets} from '~/services/spring-boot/Jira';

import useProjectTickets from './useProjectTickets';

vi.mock('~/services/spring-boot/Jira', () => ({
	getProjectTickets: vi.fn(),
}));

describe('[HOOK-BUSINESSEVENTS-USEPROJECTTICKETS] useProjectTickets', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('skips the request with loading false when skip is set', async () => {
		const {result} = renderHook(() =>
			useProjectTickets(undefined, 'PRJCT-1', true)
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(getProjectTickets).not.toHaveBeenCalled();
		expect(result.current.tickets).toBeUndefined();
	});

	it('skips the request with loading false without an ERC', async () => {
		const {result} = renderHook(() => useProjectTickets());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(getProjectTickets).not.toHaveBeenCalled();
	});

	it('passes the ticket IDs parsed from the business event', async () => {
		const tickets = [{key: 'LRSD-1'}];

		vi.mocked(getProjectTickets).mockResolvedValue({items: tickets});

		const businessEvent = {
			associatedTickets: '["LRSD-1","LRSD-2"]',
		} as IBusinessEvent;

		const {result} = renderHook(() =>
			useProjectTickets(businessEvent, 'PRJCT-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(getProjectTickets).toHaveBeenCalledWith('PRJCT-1', [
			'LRSD-1',
			'LRSD-2',
		]);
		expect(result.current.tickets).toEqual(tickets);
	});

	it('passes undefined ticket IDs without a business event', async () => {
		vi.mocked(getProjectTickets).mockResolvedValue({items: []});

		const {result} = renderHook(() =>
			useProjectTickets(undefined, 'PRJCT-1')
		);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(getProjectTickets).toHaveBeenCalledWith('PRJCT-1', undefined);
	});

	it('resets the tickets to undefined on failure', async () => {
		vi.mocked(getProjectTickets).mockRejectedValue(new Error('failed'));

		const {result} = renderHook(() =>
			useProjectTickets(undefined, 'PRJCT-1')
		);

		await waitFor(() => expect(getProjectTickets).toHaveBeenCalled());
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.tickets).toBeUndefined();
	});
});
