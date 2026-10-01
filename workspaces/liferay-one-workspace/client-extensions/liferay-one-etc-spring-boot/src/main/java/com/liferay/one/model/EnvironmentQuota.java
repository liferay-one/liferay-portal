/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.one.constants.EnvironmentConstants;

import java.util.List;
import java.util.Objects;

/**
 * @author Ryan Schuhler
 */
public class EnvironmentQuota {

	public EnvironmentQuota(
		long contractId, List<Environment> environments, int maxClusterNodes,
		int totalCount, String type, boolean unlimited, int usedCount) {

		_contractId = contractId;
		_environments = environments;
		_maxClusterNodes = maxClusterNodes;
		_totalCount = totalCount;
		_type = type;
		_unlimited = unlimited;
		_usedCount = usedCount;
	}

	public Environment fetchPendingEnvironment() {
		for (Environment environment : _environments) {
			if (Objects.equals(
					EnvironmentConstants.ACTIVATION_STATUS_PENDING,
					environment.getActivationStatus())) {

				return environment;
			}
		}

		return null;
	}

	public int getAvailableCount() {
		return Math.max(0, _totalCount - _usedCount);
	}

	public long getContractId() {
		return _contractId;
	}

	public List<Environment> getEnvironments() {
		return _environments;
	}

	public int getMaxClusterNodes() {
		return _maxClusterNodes;
	}

	public int getTotalCount() {
		return _totalCount;
	}

	public String getType() {
		return _type;
	}

	public int getUsedCount() {
		return _usedCount;
	}

	public boolean isAvailable() {
		if (_unlimited || (getAvailableCount() > 0)) {
			return true;
		}

		return false;
	}

	public boolean isUnlimited() {
		return _unlimited;
	}

	private final long _contractId;
	private final List<Environment> _environments;
	private final int _maxClusterNodes;
	private final int _totalCount;
	private final String _type;
	private final boolean _unlimited;
	private final int _usedCount;

}