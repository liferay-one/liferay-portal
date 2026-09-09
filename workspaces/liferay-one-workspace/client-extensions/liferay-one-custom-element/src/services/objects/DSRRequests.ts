/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import fetcher from '~/services/fetcher/fetcher';

export type DSRRequest = {
	acceptEulaAgreement?: boolean;
	acceptTermsAndConditions?: boolean;
	corpProjectName?: string;
	corpProjectUuid?: string;
	dataCenterLocation?: string;
	hostName?: string;
	incidentReportEmailAddresses?: string;
	ipAddresses?: string;
	macAddresses?: string;
	name?: string;
	ownerEmailAddress?: string;
	r_orderToDSRRequest_commerceOrderId?: string;
	serverLocation?: string;
	workspaceName?: string;
	workspaceOwnerEmail?: string;
};

export default class DSRRequests {
	static async createDSRRequest(body: DSRRequest) {
		return fetcher.post('/o/c/dsrrequests', body);
	}
}
