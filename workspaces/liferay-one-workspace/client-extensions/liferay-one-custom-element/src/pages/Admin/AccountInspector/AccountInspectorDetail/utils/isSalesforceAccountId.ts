/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const SALESFORCE_ACCOUNT_ID_PATTERN = /^001[A-Za-z0-9]{12}([A-Za-z0-9]{3})?$/;

export default function isSalesforceAccountId(
	externalReferenceCode: string | undefined
) {
	return SALESFORCE_ACCOUNT_ID_PATTERN.test(externalReferenceCode ?? '');
}
