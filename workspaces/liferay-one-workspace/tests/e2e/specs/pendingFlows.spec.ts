/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

// Pending stubs for LPD-87600 epics whose feature is not built yet. Each is
// wrapped in test.fixme so it is collected and skipped rather than failing the
// suite, and each carries its plan ID so plan:report classifies the flow as
// pending (counted toward go-live, not yet real). When the epic lands, move the
// flow's real assertions into a properly named spec and drop the stub here.

test.describe.fixme(
	'[FLOW-MULTI-CURRENCY-CHECKOUT] E26 Multi-Currency & Localization (LPD-88263)',
	() => {
		test('renders catalog and checkout totals in the account currency and persists it on the order', async () => {
			expect(false).toBe(true);
		});
	}
);

test.describe.fixme(
	'[FLOW-LOCALIZATION] E26 Multi-Currency & Localization (LPD-88263)',
	() => {
		test('renders localized labels and formats per the user locale across page groups', async () => {
			expect(false).toBe(true);
		});
	}
);
