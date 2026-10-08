/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import DeliveryOrderModel from './DeliveryOrderModel';

import type {PlacedOrder} from '~/types/orders';

function createModel(order: Record<string, unknown>) {
	return new DeliveryOrderModel(order as unknown as PlacedOrder);
}

describe('[CLIENT-MODELS-DELIVERYORDERMODEL] DeliveryOrderModel', () => {
	it.each([
		['CLIENT_EXTENSION', true],
		['COMPOSITE_APP', true],
		['DXP_APP', true],
		['LOW_CODE_CONFIGURATION', true],
		['OTHER', true],
		['CLOUD_APP', false],
		['AI_HUB', false],
	])('allows download for the %s order type: %s', (orderType, expected) => {
		expect(
			createModel({orderTypeExternalReferenceCode: orderType}).canDownload
		).toBe(expected);
	});

	it.each([
		['CLIENT_EXTENSION', 10, true],
		['COMPOSITE_APP', 10, true],
		['DXP_APP', 10, true],
		['DXP_APP', 0, false],
		['LOW_CODE_CONFIGURATION', 10, false],
		['OTHER', 10, false],
		['CLOUD_APP', 10, false],
	])(
		'generates licenses for the %s order type priced at %s: %s',
		(orderType, price, expected) => {
			expect(
				createModel({
					orderTypeExternalReferenceCode: orderType,
					placedOrderItems: [{price: {price}}],
				}).canGenerateLicenses
			).toBe(expected);
		}
	);

	it.each([
		['CLIENT_EXTENSION', true],
		['COMPOSITE_APP', true],
		['DXP_APP', true],
		['LOW_CODE_CONFIGURATION', false],
		['CLOUD_APP', false],
	])(
		'marks the %s order type as licensable without the item price: %s',
		(orderType, expected) => {
			expect(
				createModel({orderTypeExternalReferenceCode: orderType})
					.isLicensable
			).toBe(expected);
		}
	);

	it('maps every custom field key to the order custom field value', () => {
		const model = createModel({
			customFields: {
				'cloud-provisioning': 'provisioning',
				'cloudProjectName': 'cloud project',
				'koroneiki-project': 'koroneiki',
				'ldpAnalyticsCloudProject': 'ldp',
				'order-metadata': 'metadata',
				'projectName': 'project',
				'trial-end-date': 'end',
				'trial-error': 'error',
				'trial-settings': 'settings',
				'trial-start-date': 'start',
				'trial-virtual-host': 'host',
			},
		});

		expect(model.customFields).toEqual({
			CLOUD_PROJECT_NAME: 'cloud project',
			CLOUD_PROVISIONING: 'provisioning',
			KORONEIKI_PROJECT: 'koroneiki',
			LDP_ANALYTICS_CLOUD_PROJECT: 'ldp',
			ORDER_METADATA: 'metadata',
			PROJECT_NAME: 'project',
			TRIAL_END_DATE: 'end',
			TRIAL_ERROR: 'error',
			TRIAL_SETTINGS: 'settings',
			TRIAL_START_DATE: 'start',
			TRIAL_VIRTUAL_HOST: 'host',
		});
	});

	it('maps the custom field keys to undefined when the order has no custom fields', () => {
		const customFields = createModel({}).customFields;

		expect(Object.keys(customFields)).toHaveLength(11);
		expect(
			Object.values(customFields).every((value) => value === undefined)
		).toBe(true);
	});

	it('reads cancelled and completed from the status code', () => {
		const cancelled = createModel({orderStatusInfo: {code: 8}});
		const completed = createModel({orderStatusInfo: {code: 0}});
		const pending = createModel({orderStatusInfo: {code: 1}});

		expect(cancelled.isCancelled).toBe(true);
		expect(cancelled.isOrderCompleted).toBe(false);
		expect(completed.isCancelled).toBe(false);
		expect(completed.isOrderCompleted).toBe(true);
		expect(pending.isCancelled).toBe(false);
		expect(pending.isOrderCompleted).toBe(false);
		expect(createModel({}).isCancelled).toBe(false);
		expect(createModel({}).isOrderCompleted).toBe(false);
	});

	it('reads the free app flag from the first item price', () => {
		expect(
			createModel({placedOrderItems: [{price: {price: 0}}]}).isFreeApp
		).toBe(true);
		expect(
			createModel({placedOrderItems: [{price: {price: 5}}]}).isFreeApp
		).toBe(false);
		expect(createModel({}).isFreeApp).toBe(false);
	});

	it('returns the items, thumbnail, and create date', () => {
		const model = createModel({
			createDate: '2026-01-01',
			placedOrderItems: [{thumbnail: 'thumbnail.png'}],
		});

		expect(model.createDate).toBe('2026-01-01');
		expect(model.placedOrderItems).toEqual([{thumbnail: 'thumbnail.png'}]);
		expect(model.productThumbnail).toBe('thumbnail.png');
	});

	it('returns empty defaults when the items are missing', () => {
		const model = createModel({});

		expect(model.placedOrderItems).toEqual([]);
		expect(model.productThumbnail).toBeUndefined();
	});
});
