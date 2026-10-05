/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import useCanViewTickets from './useCanViewTickets';

const {FromUserAgentApplication, oauth2Fetch} = vi.hoisted(() => ({
	FromUserAgentApplication: vi.fn(),
	oauth2Fetch: vi.fn(),
}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication,
}));

function mockBody(body: string) {
	oauth2Fetch.mockResolvedValue({text: () => Promise.resolve(body)});
}

describe('[HOOK-BUSINESSEVENTS-USECANVIEWTICKETS] useCanViewTickets', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		FromUserAgentApplication.mockResolvedValue({fetch: oauth2Fetch});
	});

	it('sends no request when skip is set', async () => {
		const {result} = renderHook(() => useCanViewTickets('PRJCT-1', true));

		await Promise.resolve();

		expect(FromUserAgentApplication).not.toHaveBeenCalled();
		expect(result.current).toEqual({
			canViewTickets: undefined,
			loading: false,
		});
	});

	it('sends no request without a project ERC', async () => {
		const {result} = renderHook(() => useCanViewTickets(undefined));

		await Promise.resolve();

		expect(FromUserAgentApplication).not.toHaveBeenCalled();
		expect(result.current).toEqual({
			canViewTickets: undefined,
			loading: false,
		});
	});

	it('maps a non empty object key body to true', async () => {
		mockBody('ACCOUNT-KEY');

		const {result} = renderHook(() => useCanViewTickets('PRJCT-1'));

		await waitFor(() => expect(result.current.canViewTickets).toBe(true));

		expect(FromUserAgentApplication).toHaveBeenCalledWith(
			'liferay-one-etc-spring-boot-oaua'
		);
		expect(oauth2Fetch).toHaveBeenCalledWith(
			'/projects/PRJCT-1/jira/object-key'
		);
		expect(result.current.loading).toBe(false);
	});

	it('maps an empty body to false', async () => {
		mockBody('');

		const {result} = renderHook(() => useCanViewTickets('PRJCT-1'));

		await waitFor(() => expect(result.current.canViewTickets).toBe(false));

		expect(result.current.loading).toBe(false);
	});

	it('leaves the value undefined and clears loading on a fetch failure', async () => {
		oauth2Fetch.mockRejectedValue(new Error('failed'));

		const {result} = renderHook(() => useCanViewTickets('PRJCT-1'));

		await waitFor(() => expect(oauth2Fetch).toHaveBeenCalled());
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.canViewTickets).toBeUndefined();
	});
});
