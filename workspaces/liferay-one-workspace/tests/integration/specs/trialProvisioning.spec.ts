/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect} from '@playwright/test';

import {apiTest as test} from '../fixtures/apiTest';
import {HeadlessPage} from '../helpers/APIHelpers';

const trialProductERC =
	process.env.ONE_TRIAL_PRODUCT_ERC ?? 'TRIAL-PRODUCT-001';

interface ITrial {
	externalReferenceCode: string;
	productExternalReferenceCode: string;
	status: string;
}

function trialsForProduct(api: {
	get: <T>(path: string) => Promise<T>;
}): Promise<HeadlessPage<ITrial>> {
	return api.get<HeadlessPage<ITrial>>(
		`/o/c/trials?filter=${encodeURIComponent(
			`productExternalReferenceCode eq '${trialProductERC}'`
		)}`
	);
}

test.describe.fixme('[FLOW-TRIAL-PROVISIONING] trial provisioning', () => {
	test('[FLOW-TRIAL-PROVISIONING] provisions an active trial resource', async ({
		api,
	}) => {
		const provisioned = await api.post<ITrial>(
			'/o/one/v1/trials/provision',
			{
				productExternalReferenceCode: trialProductERC,
			}
		);

		expect(provisioned.status).toBe('ACTIVE');

		const {items} = await trialsForProduct(api);

		expect(
			items.some(
				(trial) =>
					trial.externalReferenceCode ===
					provisioned.externalReferenceCode
			)
		).toBe(true);
	});
});

test.describe.fixme('[FLOW-TRIAL-EXPIRY] trial expiry', () => {
	test('[FLOW-TRIAL-EXPIRY] deactivates an expired trial', async ({api}) => {
		const provisioned = await api.post<ITrial>(
			'/o/one/v1/trials/provision',
			{
				productExternalReferenceCode: trialProductERC,
			}
		);

		await api.send(
			'post',
			`/o/one/v1/trials/${provisioned.externalReferenceCode}/expire`
		);

		const {items} = await trialsForProduct(api);

		expect(
			items.find(
				(trial) =>
					trial.externalReferenceCode ===
					provisioned.externalReferenceCode
			)?.status
		).toBe('EXPIRED');
	});
});
