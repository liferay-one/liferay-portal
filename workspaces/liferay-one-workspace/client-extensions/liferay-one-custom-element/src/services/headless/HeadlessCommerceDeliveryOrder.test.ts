/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import fetcher from '~/services/fetcher/fetcher';

import HeadlessCommerceDeliveryOrder from './HeadlessCommerceDeliveryOrder';

vi.mock('~/services/fetcher/fetcher', () => ({
	default: vi.fn(),
}));

describe('[CLIENT-HEADLESS-HEADLESSCOMMERCEDELIVERYORDER] HeadlessCommerceDeliveryOrder', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('asks for every item of a placed order', async () => {
		await HeadlessCommerceDeliveryOrder.getPlacedOrder(7);

		expect(fetcher).toHaveBeenCalledWith(
			'o/headless-commerce-delivery-order/v1.0/placed-orders/7?nestedFields=placedOrderItems&placedOrderItems.pageSize=-1'
		);
	});
});
