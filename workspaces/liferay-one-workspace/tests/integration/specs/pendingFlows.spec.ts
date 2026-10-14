/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

test.describe.fixme(
	'[FLOW-CONSUMPTION-METERING] E24 Consumption-Based Billing (LPD-88265)',
	() => {
		test('meters per-account and per-project usage into billable consumption records', async () => {
			expect(false).toBe(true);
		});
	}
);

test.describe.fixme(
	'[FLOW-CONSUMPTION-BILLING] E24 Consumption-Based Billing (LPD-88265)',
	() => {
		test('converts aggregated consumption to Stripe charges, billing overage idempotently', async () => {
			expect(false).toBe(true);
		});
	}
);
