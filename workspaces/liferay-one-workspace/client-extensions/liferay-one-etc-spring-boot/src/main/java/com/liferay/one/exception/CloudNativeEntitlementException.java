/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.exception;

/**
 * @author Amos Fong
 */
public class CloudNativeEntitlementException extends Exception {

	public CloudNativeEntitlementException(long accountEntryId) {
		super(
			"Account " + accountEntryId +
				" does not have an active Cloud Native entitlement");

		_accountEntryId = accountEntryId;
	}

	public long getAccountEntryId() {
		return _accountEntryId;
	}

	private final long _accountEntryId;

}