/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.subscription.upgrade;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Entitlement;
import com.liferay.one.service.CommerceOrderItemService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.ContractService;

import java.time.Instant;

import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Veloso
 */
@DisplayName(
	"[SVC-SUBSCRIPTIONUPGRADECHECKERHELPER] SubscriptionUpgradeCheckerHelper"
)
public class SubscriptionUpgradeCheckerHelperTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_subscriptionUpgradeCheckerHelper, "_commerceOrderItemService",
			_commerceOrderItemService);
		ReflectionTestUtils.setField(
			_subscriptionUpgradeCheckerHelper, "_commerceOrderService",
			_commerceOrderService);
		ReflectionTestUtils.setField(
			_subscriptionUpgradeCheckerHelper, "_composablePricebookIds",
			_PRICEBOOK_ID_COMPOSABLE);
		ReflectionTestUtils.setField(
			_subscriptionUpgradeCheckerHelper, "_contractService",
			_contractService);
	}

	@Test
	public void testFetchContractEndDateInstant() throws Exception {
		Instant endDateInstant = Instant.parse("2027-10-31T00:00:00Z");

		Mockito.when(
			_contractService.fetchContract(1)
		).thenReturn(
			new Contract(
				new JSONObject(
				).put(
					"endDate", endDateInstant.toString()
				).put(
					"id", 1
				))
		);

		Assertions.assertEquals(
			endDateInstant,
			_subscriptionUpgradeCheckerHelper.fetchContractEndDateInstant(
				SubscriptionUpgradeCheckerTestUtil.createEntitlement(
					1, 1, "SKU")));
	}

	@Test
	public void testFetchContractEndDateInstantWithPastEndDate()
		throws Exception {

		Mockito.when(
			_contractService.fetchContract(1)
		).thenReturn(
			new Contract(
				new JSONObject(
				).put(
					"endDate", "2020-01-01T00:00:00Z"
				).put(
					"id", 1
				))
		);

		Assertions.assertNull(
			_subscriptionUpgradeCheckerHelper.fetchContractEndDateInstant(
				SubscriptionUpgradeCheckerTestUtil.createEntitlement(
					1, 1, "SKU")));
	}

	@Test
	public void testFetchContractEndDateInstantWithoutContract()
		throws Exception {

		Assertions.assertNull(
			_subscriptionUpgradeCheckerHelper.fetchContractEndDateInstant(
				SubscriptionUpgradeCheckerTestUtil.createEntitlement(
					0, 1, "SKU")));
		Assertions.assertNull(
			_subscriptionUpgradeCheckerHelper.fetchContractEndDateInstant(
				SubscriptionUpgradeCheckerTestUtil.createEntitlement(
					1, 1, "SKU")));

		Mockito.verify(
			_contractService
		).fetchContract(
			1
		);
	}

	@Test
	public void testFetchContractEndDateInstantWithoutEndDate()
		throws Exception {

		Mockito.when(
			_contractService.fetchContract(1)
		).thenReturn(
			new Contract(
				new JSONObject(
				).put(
					"id", 1
				))
		);

		Assertions.assertNull(
			_subscriptionUpgradeCheckerHelper.fetchContractEndDateInstant(
				SubscriptionUpgradeCheckerTestUtil.createEntitlement(
					1, 1, "SKU")));
	}

	@Test
	public void testHasComposablePricebook() throws Exception {
		_setUpOrder(_PRICEBOOK_ID_COMPOSABLE);

		Assertions.assertTrue(
			_subscriptionUpgradeCheckerHelper.hasComposablePricebook(
				_entitlement));

		_setUpOrder("OTHER_PRICEBOOK_ID");

		Assertions.assertFalse(
			_subscriptionUpgradeCheckerHelper.hasComposablePricebook(
				_entitlement));

		_setUpOrder("");

		Assertions.assertFalse(
			_subscriptionUpgradeCheckerHelper.hasComposablePricebook(
				_entitlement));
	}

	@Test
	public void testHasComposablePricebookWithConfiguration() throws Exception {
		_setUpOrder(_PRICEBOOK_ID_COMPOSABLE);

		ReflectionTestUtils.setField(
			_subscriptionUpgradeCheckerHelper, "_composablePricebookIds",
			"OTHER_PRICEBOOK_ID," + _PRICEBOOK_ID_COMPOSABLE);

		Assertions.assertTrue(
			_subscriptionUpgradeCheckerHelper.hasComposablePricebook(
				_entitlement));

		ReflectionTestUtils.setField(
			_subscriptionUpgradeCheckerHelper, "_composablePricebookIds",
			"unused");

		Assertions.assertFalse(
			_subscriptionUpgradeCheckerHelper.hasComposablePricebook(
				_entitlement));
	}

	@Test
	public void testHasComposablePricebookWithoutOrderItem() throws Exception {
		Assertions.assertFalse(
			_subscriptionUpgradeCheckerHelper.hasComposablePricebook(
				_entitlement));
	}

	private void _setUpOrder(String salesforcePricebookId) throws Exception {
		OrderItem orderItem = new OrderItem();

		orderItem.setOrderId(_ORDER_ID);

		Mockito.when(
			_commerceOrderItemService.fetchCommerceOrderItem(
				_entitlement.getCommerceOrderItemId())
		).thenReturn(
			orderItem
		);

		Order order = new Order();

		order.setCustomFields(
			Map.of("salesforcePricebookId", salesforcePricebookId));

		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(_ORDER_ID)
		).thenReturn(
			order
		);
	}

	private static final long _ORDER_ID = 200;

	private static final String _PRICEBOOK_ID_COMPOSABLE =
		"COMPOSABLE_PRICEBOOK_ID";

	private final CommerceOrderItemService _commerceOrderItemService =
		Mockito.mock(CommerceOrderItemService.class);
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private final ContractService _contractService = Mockito.mock(
		ContractService.class);
	private final Entitlement _entitlement =
		SubscriptionUpgradeCheckerTestUtil.createEntitlement(1, 1, "SKU");
	private final SubscriptionUpgradeCheckerHelper
		_subscriptionUpgradeCheckerHelper =
			new SubscriptionUpgradeCheckerHelper();

}