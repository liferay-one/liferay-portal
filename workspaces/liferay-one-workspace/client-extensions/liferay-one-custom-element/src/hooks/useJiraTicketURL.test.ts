/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProperties} from '~/context/PropertiesContext';

import useJiraTicketURL from './useJiraTicketURL';

vi.mock('~/context/PropertiesContext', () => ({
	useProperties: vi.fn(),
}));

function mockProperties(properties: Record<string, string | undefined>) {
	vi.mocked(useProperties).mockReturnValue(
		properties as unknown as ReturnType<typeof useProperties>
	);
}

describe('[HOOK-USEJIRATICKETURL] useJiraTicketURL', () => {
	beforeEach(() => {
		vi.mocked(useProperties).mockReset();
	});

	it('uses the FLS portal URL for a ticket ID in the FLS project', () => {
		mockProperties({
			jiraFLSPortalURL: 'https://fls.example.com/browse',
			jiraFLSProject: 'FLS',
			jiraHCPortalURL: 'https://hc.example.com/browse',
		});

		const {result} = renderHook(() => useJiraTicketURL('FLS-12'));

		expect(result.current).toBe('https://fls.example.com/browse/FLS-12');
	});

	it('uses the HC portal URL for any other ticket ID', () => {
		mockProperties({
			jiraFLSPortalURL: 'https://fls.example.com/browse',
			jiraFLSProject: 'FLS',
			jiraHCPortalURL: 'https://hc.example.com/browse',
		});

		const {result} = renderHook(() => useJiraTicketURL('LRSD-12'));

		expect(result.current).toBe('https://hc.example.com/browse/LRSD-12');
	});

	it('uses the HC portal URL when no FLS project is configured', () => {
		mockProperties({
			jiraFLSPortalURL: 'https://fls.example.com/browse',
			jiraHCPortalURL: 'https://hc.example.com/browse',
		});

		const {result} = renderHook(() => useJiraTicketURL('FLS-12'));

		expect(result.current).toBe('https://hc.example.com/browse/FLS-12');
	});

	it('falls back to an empty prefix when the FLS portal URL is missing', () => {
		mockProperties({jiraFLSProject: 'FLS'});

		const {result} = renderHook(() => useJiraTicketURL('FLS-12'));

		expect(result.current).toBe('/FLS-12');
	});

	it('falls back to an empty prefix when the HC portal URL is missing', () => {
		mockProperties({});

		const {result} = renderHook(() => useJiraTicketURL('LRSD-12'));

		expect(result.current).toBe('/LRSD-12');
	});
});
