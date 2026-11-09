/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it, vi} from 'vitest';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/utils/constants';
import Projects from '~/services/spring-boot/Projects';

import {projectPlacedOrdersQuery} from './projectPlacedOrdersQuery';

vi.mock('~/services/spring-boot/Projects', () => ({
	default: {getPlacedOrders: vi.fn()},
}));

describe('projectPlacedOrdersQuery', () => {
	it('requests the project orders with the restricted fields', async () => {
		await projectPlacedOrdersQuery('PRJCT-ALPHA').fetcher();

		expect(Projects.getPlacedOrders).toHaveBeenCalledWith(
			'PRJCT-ALPHA',
			expect.stringContaining('placedOrderItems.price')
		);
	});

	it('has no key without an assigned project', () => {
		expect(projectPlacedOrdersQuery(undefined).key).toBeNull();
		expect(projectPlacedOrdersQuery(ONE_TIME_PURCHASES).key).toBeNull();
	});

	it('does not restrict the custom fields that the project filter reads', async () => {
		await projectPlacedOrdersQuery('PRJCT-ALPHA').fetcher();

		const [, restrictFields] = vi.mocked(Projects.getPlacedOrders).mock
			.calls[0];

		expect(restrictFields?.split(',')).not.toContain('customFields');
	});
});
