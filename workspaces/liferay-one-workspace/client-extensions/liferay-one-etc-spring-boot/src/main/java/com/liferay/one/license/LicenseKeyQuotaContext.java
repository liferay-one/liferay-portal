/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import java.util.HashMap;
import java.util.Map;

/**
 * @author Allen Ziegenfus
 */
public class LicenseKeyQuotaContext {

	public long getPendingServerCount(long entitlementId) {
		Long pendingServerCount = _pendingServerCounts.get(entitlementId);

		if (pendingServerCount == null) {
			return 0;
		}

		return pendingServerCount;
	}

	public long getServerCount(long entitlementId) {
		return _serverCounts.get(entitlementId);
	}

	public boolean hasServerCount(long entitlementId) {
		return _serverCounts.containsKey(entitlementId);
	}

	public void setPendingServerCount(
		long entitlementId, long pendingServerCount) {

		_pendingServerCounts.put(entitlementId, pendingServerCount);
	}

	public void setServerCount(long entitlementId, long serverCount) {
		_serverCounts.put(entitlementId, serverCount);
	}

	private final Map<Long, Long> _pendingServerCounts = new HashMap<>();
	private final Map<Long, Long> _serverCounts = new HashMap<>();

}