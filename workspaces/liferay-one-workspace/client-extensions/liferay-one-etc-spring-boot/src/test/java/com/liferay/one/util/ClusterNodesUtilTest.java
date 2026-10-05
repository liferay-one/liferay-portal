/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.model.Entitlement;

import java.util.Arrays;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-CLUSTERNODESUTIL] ClusterNodesUtil")
public class ClusterNodesUtilTest {

	@Test
	public void testGetMaxClusterNodesForNonproductionIsOne() {
		Assertions.assertEquals(
			1,
			ClusterNodesUtil.getMaxClusterNodes(
				_entitlements, EnvironmentConstants.TYPE_NONPRODUCTION));
	}

	@Test
	public void testGetMaxClusterNodesForProductionTakesLargestPodEntitlement() {
		Assertions.assertEquals(
			5,
			ClusterNodesUtil.getMaxClusterNodes(
				_entitlements, EnvironmentConstants.TYPE_PRODUCTION));
	}

	@Test
	public void testGetMaxClusterNodesForUATTakesLargestPodEntitlement() {
		Assertions.assertEquals(
			5,
			ClusterNodesUtil.getMaxClusterNodes(
				_entitlements, EnvironmentConstants.TYPE_UAT));
	}

	@Test
	public void testGetMaxClusterNodesWithoutPodEntitlementsIsOne() {
		Assertions.assertEquals(
			1,
			ClusterNodesUtil.getMaxClusterNodes(
				Arrays.asList(
					_createEntitlement(
						EntitlementConstants.NAME_UP_TO_3_PRODUCTION_PODS,
						null),
					_createEntitlement(
						EntitlementConstants.NAME_GOLD_SUPPORT, 9.0)),
				EnvironmentConstants.TYPE_PRODUCTION));
	}

	@Test
	public void testHasProductionSizing() {
		Assertions.assertFalse(
			ClusterNodesUtil.hasProductionSizing(
				EnvironmentConstants.TYPE_NONPRODUCTION));
		Assertions.assertFalse(ClusterNodesUtil.hasProductionSizing(null));
		Assertions.assertTrue(
			ClusterNodesUtil.hasProductionSizing(
				EnvironmentConstants.TYPE_PRODUCTION));
		Assertions.assertTrue(
			ClusterNodesUtil.hasProductionSizing(
				EnvironmentConstants.TYPE_UAT));
	}

	private static Entitlement _createEntitlement(
		String name, Double quantity) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"id", 1
		).put(
			"name", name
		);

		if (quantity != null) {
			jsonObject.put("quantity", quantity);
		}

		return new Entitlement(jsonObject);
	}

	private static final List<Entitlement> _entitlements = Arrays.asList(
		_createEntitlement(EntitlementConstants.NAME_GOLD_SUPPORT, 9.0),
		_createEntitlement(
			EntitlementConstants.NAME_UP_TO_3_PRODUCTION_PODS, 3.0),
		_createEntitlement(
			EntitlementConstants.NAME_UP_TO_5_PRODUCTION_PODS, 5.0),
		_createEntitlement(
			EntitlementConstants.NAME_UP_TO_5_PRODUCTION_PODS, null));

}