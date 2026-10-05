/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;

import java.math.BigDecimal;

import java.util.HashMap;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-CLOUDPROVISIONINGUTIL] CloudProvisioningUtil")
public class CloudProvisioningUtilTest {

	@Test
	public void testCreateCloudProvisioningJSONArrayStartsWithZeroShippedQuantity() {
		JSONArray jsonArray =
			CloudProvisioningUtil.createCloudProvisioningJSONArray(
				new OrderItem[] {
					_createOrderItem(1L, 2, "SKU-1"),
					_createOrderItem(2L, 5, "SKU-2")
				});

		Assertions.assertEquals(2, jsonArray.length());

		JSONObject jsonObject = jsonArray.getJSONObject(1);

		Assertions.assertTrue(
			jsonObject.getJSONArray(
				"deployments"
			).isEmpty());
		Assertions.assertEquals(2L, jsonObject.getLong("orderItemId"));
		Assertions.assertEquals(5, jsonObject.getInt("quantity"));
		Assertions.assertEquals(0, jsonObject.getInt("shippedQuantity"));
		Assertions.assertEquals("SKU-2", jsonObject.getString("sku"));
	}

	@Test
	public void testCreateTemporaryDeploymentAppendsLoadingDeployment() {
		JSONArray jsonArray =
			CloudProvisioningUtil.createCloudProvisioningJSONArray(
				new OrderItem[] {_createOrderItem(1L, 1, "SKU-1")});

		JSONObject jsonObject = jsonArray.getJSONObject(0);

		Map<String, String> customFields = new HashMap<>();

		String deploymentId = CloudProvisioningUtil.createTemporaryDeployment(
			customFields, jsonArray, jsonObject, "project-1");

		JSONArray deploymentsJSONArray = jsonObject.getJSONArray("deployments");

		Assertions.assertEquals(1, deploymentsJSONArray.length());

		JSONObject deploymentJSONObject = deploymentsJSONArray.getJSONObject(0);

		Assertions.assertEquals(
			deploymentId, deploymentJSONObject.getString("id"));
		Assertions.assertTrue(deploymentJSONObject.getBoolean("loading"));
		Assertions.assertEquals(
			"project-1", deploymentJSONObject.getString("projectId"));

		Assertions.assertEquals(
			jsonArray.toString(), customFields.get("cloud-provisioning"));
	}

	@Test
	public void testDeleteDeploymentRemovesOnlyMatchingID() {
		JSONObject jsonObject = new JSONObject(
		).put(
			"deployments",
			new JSONArray(
			).put(
				new JSONObject(
				).put(
					"id", "a"
				)
			).put(
				new JSONObject(
				).put(
					"id", "b"
				)
			).put(
				new JSONObject(
				).put(
					"id", "c"
				)
			)
		);

		CloudProvisioningUtil.deleteDeployment("b", jsonObject);

		JSONArray deploymentsJSONArray = jsonObject.getJSONArray("deployments");

		Assertions.assertEquals(2, deploymentsJSONArray.length());
		Assertions.assertEquals(
			"a",
			deploymentsJSONArray.getJSONObject(
				0
			).getString(
				"id"
			));
		Assertions.assertEquals(
			"c",
			deploymentsJSONArray.getJSONObject(
				1
			).getString(
				"id"
			));

		CloudProvisioningUtil.deleteDeployment("missing", jsonObject);

		Assertions.assertEquals(2, deploymentsJSONArray.length());
	}

	@Test
	public void testGetCloudProvisioningJSONObject() {
		JSONArray jsonArray =
			CloudProvisioningUtil.createCloudProvisioningJSONArray(
				new OrderItem[] {
					_createOrderItem(1L, 1, "SKU-1"),
					_createOrderItem(2L, 1, "SKU-2")
				});

		Assertions.assertEquals(
			"SKU-2",
			CloudProvisioningUtil.getCloudProvisioningJSONObject(
				jsonArray, 2L
			).getString(
				"sku"
			));
		Assertions.assertTrue(
			CloudProvisioningUtil.getCloudProvisioningJSONObject(
				jsonArray, 3L
			).isEmpty());
	}

	private OrderItem _createOrderItem(long id, int quantity, String sku) {
		OrderItem orderItem = new OrderItem();

		orderItem.setId(id);
		orderItem.setQuantity(BigDecimal.valueOf(quantity));
		orderItem.setSku(sku);

		return orderItem;
	}

}