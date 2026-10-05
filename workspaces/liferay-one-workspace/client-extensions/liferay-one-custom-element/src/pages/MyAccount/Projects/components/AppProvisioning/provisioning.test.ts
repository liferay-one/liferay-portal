/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	getCloudProvisioning,
	getDeploymentsByOrderItemId,
	hasDeploymentInProgress,
} from './provisioning';

import type {PlacedOrder} from '~/types/orders';

function toOrder(value?: unknown) {
	return {
		customFields:
			value === undefined
				? {}
				: {
						'cloud-provisioning':
							typeof value === 'string'
								? value
								: JSON.stringify(value),
					},
	} as unknown as PlacedOrder;
}

const PROVISIONING = [
	{
		deployments: [{id: 'a', loading: false}],
		orderItemId: 1,
	},
	{
		orderItemId: 2,
	},
];

describe('[MOD-MYACCOUNT-PROJECTS-APPPROVISIONING-PROVISIONING] provisioning', () => {
	it('parses the cloud provisioning custom field', () => {
		expect(getCloudProvisioning(toOrder(PROVISIONING))).toEqual(
			PROVISIONING
		);
	});

	it('returns an empty list for a missing order, missing field, bad JSON, or a non array', () => {
		expect(getCloudProvisioning()).toEqual([]);
		expect(getCloudProvisioning(toOrder())).toEqual([]);
		expect(getCloudProvisioning(toOrder('{not json'))).toEqual([]);
		expect(getCloudProvisioning(toOrder({orderItemId: 1}))).toEqual([]);
	});

	it('maps deployments by order item ID and defaults missing deployments to empty', () => {
		const deploymentsByOrderItemId = getDeploymentsByOrderItemId(
			toOrder(PROVISIONING)
		);

		expect(deploymentsByOrderItemId.get(1)).toEqual([
			{id: 'a', loading: false},
		]);
		expect(deploymentsByOrderItemId.get(2)).toEqual([]);
		expect(getDeploymentsByOrderItemId().size).toBe(0);
	});

	it('reports in progress only when a deployment is loading', () => {
		expect(hasDeploymentInProgress(toOrder(PROVISIONING))).toBe(false);
		expect(
			hasDeploymentInProgress(
				toOrder([
					...PROVISIONING,
					{deployments: [{id: 'b', loading: true}], orderItemId: 3},
				])
			)
		).toBe(true);
		expect(hasDeploymentInProgress()).toBe(false);
	});
});
