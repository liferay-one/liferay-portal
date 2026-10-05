/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

async function importAnalytics() {
	vi.resetModules();

	return import('./Analytics');
}

describe('[CLIENT-LIFERAY-ANALYTICS] Analytics', () => {
	afterEach(() => {
		Reflect.deleteProperty(window, 'Analytics');
	});

	it('does nothing when window.Analytics is absent', async () => {
		Reflect.deleteProperty(window, 'Analytics');

		const {Analytics} = await importAnalytics();

		expect(() =>
			Analytics.track('APP_PURCHASE', {orderId: 1})
		).not.toThrow();
	});

	it('sends the mapped event label for the key with the data', async () => {
		const track = vi.fn();

		window.Analytics = {track};

		const {Analytics, AnalyticsKeys} = await importAnalytics();

		Analytics.track('ORDER_CREATION', {orderId: 1});
		Analytics.track('VIRTUAL_URL_NOT_FOUND', {url: '/missing'});

		expect(track.mock.calls).toEqual([
			[AnalyticsKeys.ORDER_CREATION, {orderId: 1}],
			['Virtual URL not found', {url: '/missing'}],
		]);
		expect(AnalyticsKeys.ORDER_CREATION).toBe('Order Creation');
	});
});
