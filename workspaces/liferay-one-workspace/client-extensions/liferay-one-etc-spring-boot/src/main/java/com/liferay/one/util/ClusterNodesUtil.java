/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.model.Entitlement;

import java.util.List;
import java.util.Objects;

/**
 * @author Ryan Schuhler
 */
public class ClusterNodesUtil {

	public static int getMaxClusterNodes(
		List<Entitlement> entitlements, String type) {

		int maxClusterNodes = 1;

		if (!hasProductionSizing(type)) {
			return maxClusterNodes;
		}

		for (Entitlement entitlement : entitlements) {
			if (!EntitlementConstants.namesProductionPods.contains(
					entitlement.getName())) {

				continue;
			}

			Double quantity = entitlement.getQuantity();

			if (quantity == null) {
				continue;
			}

			int curMaxClusterNodes = quantity.intValue();

			if (curMaxClusterNodes > maxClusterNodes) {
				maxClusterNodes = curMaxClusterNodes;
			}
		}

		return maxClusterNodes;
	}

	public static boolean hasProductionSizing(String type) {
		if (Objects.equals(type, EnvironmentConstants.TYPE_PRODUCTION) ||
			Objects.equals(type, EnvironmentConstants.TYPE_UAT)) {

			return true;
		}

		return false;
	}

}