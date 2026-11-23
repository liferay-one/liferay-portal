/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import fetcher from '~/services/fetcher/fetcher';

import type {APIResponse} from '~/types/api';

export type Environment = {
	externalEnvironmentId?: string;
	externalReferenceCode: string;
	id: number;
	r_contractToEnvironment_c_contractERC?: string;
	r_contractToEnvironment_c_contractId?: number;
};

export default class Environments {
	static getEnvironments(params = new URLSearchParams()) {
		return fetcher<APIResponse<Environment>>(`/o/c/environments?${params}`);
	}
}
