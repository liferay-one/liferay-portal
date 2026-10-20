/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import fetcher from '~/services/fetcher/fetcher';

import type {APIResponse} from '~/types/api';
import type {TaxCategory} from '~/types/commerce';

export default class HeadlessCommerceAdminChannel {
	static async getTaxCategories(searchParams = new URLSearchParams()) {
		return fetcher<APIResponse<TaxCategory>>(
			`/o/headless-commerce-admin-channel/v1.0/tax-categories?${searchParams.toString()}`
		);
	}
}
