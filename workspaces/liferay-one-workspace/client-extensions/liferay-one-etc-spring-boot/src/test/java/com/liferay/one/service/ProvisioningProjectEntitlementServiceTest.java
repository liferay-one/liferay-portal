/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.model.Project;
import com.liferay.one.salesforce.model.SalesforceModelTestUtil;
import com.liferay.one.salesforce.model.SalesforceOpportunity;
import com.liferay.one.salesforce.model.SalesforceOpportunityLineItem;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Franca
 */
public class ProvisioningProjectEntitlementServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_provisioningProjectEntitlementService =
			new ProvisioningProjectEntitlementService();

		_commerceOrderItemService = Mockito.mock(
			CommerceOrderItemService.class);
		_commerceOrderService = Mockito.mock(CommerceOrderService.class);
		_commerceSkuService = Mockito.mock(CommerceSkuService.class);
		_entitlementService = Mockito.mock(EntitlementService.class);
		_projectService = Mockito.mock(ProjectService.class);

		ReflectionTestUtils.setField(
			_provisioningProjectEntitlementService, "_commerceOrderItemService",
			_commerceOrderItemService);
		ReflectionTestUtils.setField(
			_provisioningProjectEntitlementService, "_commerceOrderService",
			_commerceOrderService);
		ReflectionTestUtils.setField(
			_provisioningProjectEntitlementService, "_commerceSkuService",
			_commerceSkuService);
		ReflectionTestUtils.setField(
			_provisioningProjectEntitlementService, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			_provisioningProjectEntitlementService, "_projectService",
			_projectService);

		Mockito.when(
			_projectService.fetchProject(Mockito.anyString())
		).thenReturn(
			new Project(new JSONObject())
		);

		Mockito.when(
			_commerceSkuService.fetchSku(Mockito.anyString())
		).thenReturn(
			new Sku()
		);

		Order newOrder = new Order();

		newOrder.setId(_NEW_ORDER_ID);

		Mockito.when(
			_commerceOrderService.upsertOrder(
				Mockito.any(Account.class), Mockito.any(), Mockito.anyString(),
				Mockito.anyString(), Mockito.anyString(), Mockito.any(),
				Mockito.anyList(), Mockito.any())
		).thenReturn(
			newOrder
		);
	}

	@Test
	public void testDeleteProjectEntitlementLineItemIsIdempotentOnReplay()
		throws Exception {

		OrderItem trimmedOrderItem = SalesforceModelTestUtil.createOrderItem(
			"Approved", "2020-01-01T00:00:00Z", "2027-01-01T00:00:00Z",
			_LINE_ITEM_ID_1, 7001L, _PRODUCT_2_ID_1, "2019-01-01T00:00:00Z");

		Order order = new Order();

		order.setExternalReferenceCode(_ENTITLEMENT_ID_1);
		order.setOrderItems(new OrderItem[] {trimmedOrderItem});

		Mockito.when(
			_commerceOrderService.fetchOrderByExternalReferenceCode(
				_ENTITLEMENT_ID_1)
		).thenReturn(
			order
		);

		_provisioningProjectEntitlementService.deleteProjectEntitlementLineItem(
			SalesforceModelTestUtil.createProjectEntitlementLineItemJSONObject(
				"2027-01-01", _LINE_ITEM_ID_1, _PRODUCT_2_ID_1,
				_ENTITLEMENT_ID_1, 1, "2026-01-01"));

		Mockito.verify(
			_commerceOrderItemService, Mockito.never()
		).patchOrderItemCustomFields(
			Mockito.anyLong(), Mockito.anyMap()
		);

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testDeleteProjectEntitlementLineItemTrimsOnlyThatOrderItem()
		throws Exception {

		OrderItem orderItem1 = SalesforceModelTestUtil.createOrderItem(
			"Approved", null, "2027-01-01T00:00:00Z", _LINE_ITEM_ID_1, 7001L,
			_PRODUCT_2_ID_1, "2026-01-01T00:00:00Z");
		OrderItem orderItem2 = SalesforceModelTestUtil.createOrderItem(
			"Approved", null, "2027-01-01T00:00:00Z", _LINE_ITEM_ID_2, 7002L,
			_PRODUCT_2_ID_2, "2026-01-01T00:00:00Z");

		Order order = new Order();

		order.setExternalReferenceCode(_ENTITLEMENT_ID_1);
		order.setOrderItems(new OrderItem[] {orderItem1, orderItem2});

		Mockito.when(
			_commerceOrderService.fetchOrderByExternalReferenceCode(
				_ENTITLEMENT_ID_1)
		).thenReturn(
			order
		);

		_provisioningProjectEntitlementService.deleteProjectEntitlementLineItem(
			SalesforceModelTestUtil.createProjectEntitlementLineItemJSONObject(
				"2027-01-01", _LINE_ITEM_ID_2, _PRODUCT_2_ID_2,
				_ENTITLEMENT_ID_1, 1, "2026-01-01"));

		Mockito.verify(
			_entitlementService
		).trimEntitlements(
			Mockito.eq(7002L), Mockito.anyString()
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).trimEntitlements(
			Mockito.eq(7001L), Mockito.anyString()
		);
	}

	@Test
	public void testDeleteProjectEntitlementTrimsEveryOrderItem()
		throws Exception {

		OrderItem orderItem1 = SalesforceModelTestUtil.createOrderItem(
			"Approved", null, "2027-01-01T00:00:00Z", _LINE_ITEM_ID_1, 7001L,
			_PRODUCT_2_ID_1, "2026-01-01T00:00:00Z");
		OrderItem orderItem2 = SalesforceModelTestUtil.createOrderItem(
			"Approved", null, "2027-01-01T00:00:00Z", _LINE_ITEM_ID_2, 7002L,
			_PRODUCT_2_ID_2, "2026-01-01T00:00:00Z");

		Order order = new Order();

		order.setExternalReferenceCode(_ENTITLEMENT_ID_1);
		order.setOrderItems(new OrderItem[] {orderItem1, orderItem2});

		Mockito.when(
			_commerceOrderService.fetchOrderByExternalReferenceCode(
				_ENTITLEMENT_ID_1)
		).thenReturn(
			order
		);

		_provisioningProjectEntitlementService.deleteProjectEntitlement(
			new JSONObject(
			).put(
				"Id", _ENTITLEMENT_ID_1
			));

		Mockito.verify(
			_entitlementService
		).trimEntitlements(
			Mockito.eq(7001L), Mockito.anyString()
		);

		Mockito.verify(
			_entitlementService
		).trimEntitlements(
			Mockito.eq(7002L), Mockito.anyString()
		);
	}

	@Test
	public void testProcessProjectEntitlementsIsolatesAFailingEntitlement()
		throws Exception {

		Order newOrder = new Order();

		newOrder.setId(_NEW_ORDER_ID);

		Mockito.when(
			_commerceOrderService.upsertOrder(
				Mockito.any(Account.class), Mockito.any(), Mockito.anyString(),
				Mockito.eq(_ENTITLEMENT_ID_1), Mockito.anyString(),
				Mockito.any(), Mockito.anyList(), Mockito.any())
		).thenThrow(
			new Exception("commerce is down")
		);

		Mockito.when(
			_commerceOrderService.upsertOrder(
				Mockito.any(Account.class), Mockito.any(), Mockito.anyString(),
				Mockito.eq(_ENTITLEMENT_ID_2), Mockito.anyString(),
				Mockito.any(), Mockito.anyList(), Mockito.any())
		).thenReturn(
			newOrder
		);

		List<String> warningMessages = new ArrayList<>();

		_provisioningProjectEntitlementService.processProjectEntitlements(
			_createAccount(), _CONTRACT_ID, "USD", _createRecordJSONObject(),
			_createSalesforceOpportunity(), null, warningMessages);

		Mockito.verify(
			_commerceOrderService
		).upsertOrder(
			Mockito.any(Account.class), Mockito.any(), Mockito.anyString(),
			Mockito.eq(_ENTITLEMENT_ID_2), Mockito.anyString(), Mockito.any(),
			Mockito.anyList(), Mockito.any()
		);

		Assertions.assertEquals(1, warningMessages.size());
	}

	@Test
	public void testProcessProjectEntitlementsMapsLineItemFields()
		throws Exception {

		_provisioningProjectEntitlementService.processProjectEntitlements(
			_createAccount(), _CONTRACT_ID, "USD", _createRecordJSONObject(),
			_createSalesforceOpportunity(), null, new ArrayList<>());

		ArgumentCaptor<SalesforceOpportunityLineItem> argumentCaptor =
			ArgumentCaptor.forClass(SalesforceOpportunityLineItem.class);

		Mockito.verify(
			_commerceOrderItemService, Mockito.atLeastOnce()
		).upsertOrderItem(
			Mockito.any(Order.class), argumentCaptor.capture(),
			Mockito.anyString()
		);

		List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems =
			argumentCaptor.getAllValues();

		SalesforceOpportunityLineItem salesforceOpportunityLineItem =
			salesforceOpportunityLineItems.get(0);

		Assertions.assertEquals(
			_PRODUCT_2_ID_1, salesforceOpportunityLineItem.getProduct2Id());
		Assertions.assertEquals(
			Double.valueOf(1), salesforceOpportunityLineItem.getQuantity());
		Assertions.assertNotNull(
			salesforceOpportunityLineItem.getServiceDateInstant());
		Assertions.assertNotNull(
			salesforceOpportunityLineItem.getEndDateInstant());
	}

	@Test
	public void testProcessProjectEntitlementsSkipsEntitlementWithoutLineItems()
		throws Exception {

		JSONObject recordJSONObject = new JSONObject(
		).put(
			"projectEntitlements",
			new JSONArray(
			).put(
				SalesforceModelTestUtil.createProjectEntitlementJSONObject(
					_ENTITLEMENT_ID_1, _PROJECT_ID_1, _OPPORTUNITY_ID)
			)
		);

		_provisioningProjectEntitlementService.processProjectEntitlements(
			_createAccount(), _CONTRACT_ID, "USD", recordJSONObject,
			_createSalesforceOpportunity(), null, new ArrayList<>());

		Mockito.verifyNoInteractions(_commerceOrderItemService);
	}

	@Test
	public void testProcessProjectEntitlementsWarnsForEveryFailedEntitlement()
		throws Exception {

		Mockito.when(
			_commerceOrderService.upsertOrder(
				Mockito.any(Account.class), Mockito.any(), Mockito.anyString(),
				Mockito.anyString(), Mockito.anyString(), Mockito.any(),
				Mockito.anyList(), Mockito.any())
		).thenThrow(
			new Exception("commerce is down")
		);

		List<String> warningMessages = new ArrayList<>();

		_provisioningProjectEntitlementService.processProjectEntitlements(
			_createAccount(), _CONTRACT_ID, "USD", _createRecordJSONObject(),
			_createSalesforceOpportunity(), null, warningMessages);

		Assertions.assertEquals(2, warningMessages.size());
	}

	@Test
	public void testProcessProjectEntitlementsWarnsOnUnknownProject()
		throws Exception {

		Mockito.when(
			_projectService.fetchProject(_PROJECT_ID_1)
		).thenReturn(
			null
		);

		List<String> warningMessages = new ArrayList<>();

		_provisioningProjectEntitlementService.processProjectEntitlements(
			_createAccount(), _CONTRACT_ID, "USD", _createRecordJSONObject(),
			_createSalesforceOpportunity(), null, warningMessages);

		Assertions.assertEquals(1, warningMessages.size());

		Mockito.verify(
			_commerceOrderService, Mockito.times(1)
		).upsertOrder(
			Mockito.any(Account.class), Mockito.any(), Mockito.anyString(),
			Mockito.eq(_ENTITLEMENT_ID_2), Mockito.anyString(), Mockito.any(),
			Mockito.anyList(), Mockito.any()
		);
	}

	@Test
	public void testUpsertProjectEntitlementKeepsTheProjectWhenThePayloadOmitsIt()
		throws Exception {

		Order order = new Order();

		order.setExternalReferenceCode(_ENTITLEMENT_ID_1);
		order.setId(_NEW_ORDER_ID);

		Mockito.when(
			_commerceOrderService.fetchOrderByExternalReferenceCode(
				_ENTITLEMENT_ID_1)
		).thenReturn(
			order
		);

		_provisioningProjectEntitlementService.upsertProjectEntitlement(
			new JSONObject(
			).put(
				"Id", _ENTITLEMENT_ID_1
			).put(
				"Purchasing_Opportunity__c", _OPPORTUNITY_ID
			));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).patchOrderCustomFields(
			Mockito.anyLong(), Mockito.anyMap()
		);
	}

	@Test
	public void testUpsertProjectEntitlementLineItemLeavesEntitlementsToTheObjectAction()
		throws Exception {

		OrderItem existingOrderItem = SalesforceModelTestUtil.createOrderItem(
			"Approved", null, "2027-01-01T00:00:00Z", _LINE_ITEM_ID_1, 7001L,
			_PRODUCT_2_ID_1, "2026-01-01T00:00:00Z");

		Order order = new Order();

		order.setExternalReferenceCode(_ENTITLEMENT_ID_1);
		order.setId(_NEW_ORDER_ID);
		order.setOrderItems(new OrderItem[] {existingOrderItem});

		Mockito.when(
			_commerceOrderService.fetchOrderByExternalReferenceCode(
				_ENTITLEMENT_ID_1)
		).thenReturn(
			order
		);

		Mockito.when(
			_commerceOrderItemService.upsertOrderItem(
				Mockito.any(Order.class),
				Mockito.any(SalesforceOpportunityLineItem.class),
				Mockito.anyString())
		).thenReturn(
			existingOrderItem
		);

		_provisioningProjectEntitlementService.upsertProjectEntitlementLineItem(
			SalesforceModelTestUtil.createProjectEntitlementLineItemJSONObject(
				"2028-01-01", _LINE_ITEM_ID_1, _PRODUCT_2_ID_1,
				_ENTITLEMENT_ID_1, 2, "2026-01-01"));

		Mockito.verify(
			_commerceOrderItemService
		).upsertOrderItem(
			Mockito.any(Order.class),
			Mockito.any(SalesforceOpportunityLineItem.class),
			Mockito.anyString()
		);

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testUpsertProjectEntitlementLineItemRequiresTheParentOrder()
		throws Exception {

		Mockito.when(
			_commerceOrderService.fetchOrderByExternalReferenceCode(
				_ENTITLEMENT_ID_1)
		).thenReturn(
			null
		);

		Assertions.assertThrows(
			Exception.class,
			() ->
				_provisioningProjectEntitlementService.
					upsertProjectEntitlementLineItem(
						SalesforceModelTestUtil.
							createProjectEntitlementLineItemJSONObject(
								"2027-01-01", _LINE_ITEM_ID_1, _PRODUCT_2_ID_1,
								_ENTITLEMENT_ID_1, 1, "2026-01-01")));
	}

	@Test
	public void testUpsertProjectEntitlementPatchesOnlyTheProjectWhenTheOrderExists()
		throws Exception {

		Order order = new Order();

		order.setExternalReferenceCode(_ENTITLEMENT_ID_1);
		order.setId(_NEW_ORDER_ID);

		Mockito.when(
			_commerceOrderService.fetchOrderByExternalReferenceCode(
				_ENTITLEMENT_ID_1)
		).thenReturn(
			order
		);

		_provisioningProjectEntitlementService.upsertProjectEntitlement(
			SalesforceModelTestUtil.createProjectEntitlementJSONObject(
				_ENTITLEMENT_ID_1, _PROJECT_ID_2, _OPPORTUNITY_ID));

		Mockito.verify(
			_commerceOrderService
		).patchOrderCustomFields(
			_NEW_ORDER_ID, Map.of("salesforceProjectId", _PROJECT_ID_2)
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).upsertProjectEntitlementOrder(
			Mockito.anyString(), Mockito.anyString(), Mockito.any(Order.class)
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).fetchOrderByExternalReferenceCode(
			_OPPORTUNITY_ID
		);
	}

	@Test
	public void testUpsertProjectEntitlementRequiresTheOpportunityOrder()
		throws Exception {

		Mockito.when(
			_commerceOrderService.fetchOrderByExternalReferenceCode(
				_OPPORTUNITY_ID)
		).thenReturn(
			null
		);

		Assertions.assertThrows(
			Exception.class,
			() ->
				_provisioningProjectEntitlementService.upsertProjectEntitlement(
					SalesforceModelTestUtil.createProjectEntitlementJSONObject(
						_ENTITLEMENT_ID_1, _PROJECT_ID_1, _OPPORTUNITY_ID)));
	}

	private Account _createAccount() {
		Account account = new Account();

		account.setExternalReferenceCode(_ACCOUNT_ID_SF);
		account.setId(_ACCOUNT_ID);

		return account;
	}

	private JSONObject _createRecordJSONObject() {
		return new JSONObject(
		).put(
			"projectEntitlementLineItems",
			new JSONArray(
			).put(
				SalesforceModelTestUtil.
					createProjectEntitlementLineItemJSONObject(
						"2027-01-01", _LINE_ITEM_ID_1, _PRODUCT_2_ID_1,
						_ENTITLEMENT_ID_1, 1, "2026-01-01")
			).put(
				SalesforceModelTestUtil.
					createProjectEntitlementLineItemJSONObject(
						"2027-01-01", _LINE_ITEM_ID_2, _PRODUCT_2_ID_2,
						_ENTITLEMENT_ID_1, 1, "2026-01-01")
			).put(
				SalesforceModelTestUtil.
					createProjectEntitlementLineItemJSONObject(
						"2027-01-01", _LINE_ITEM_ID_3, _PRODUCT_2_ID_1,
						_ENTITLEMENT_ID_2, 2, "2026-01-01")
			)
		).put(
			"projectEntitlements",
			new JSONArray(
			).put(
				SalesforceModelTestUtil.createProjectEntitlementJSONObject(
					_ENTITLEMENT_ID_1, _PROJECT_ID_1, _OPPORTUNITY_ID)
			).put(
				SalesforceModelTestUtil.createProjectEntitlementJSONObject(
					_ENTITLEMENT_ID_2, _PROJECT_ID_2, _OPPORTUNITY_ID)
			)
		);
	}

	private SalesforceOpportunity _createSalesforceOpportunity() {
		return new SalesforceOpportunity(
			new JSONObject(
			).put(
				"Id", _OPPORTUNITY_ID
			).put(
				"StageName", "Closed Won"
			));
	}

	private static final long _ACCOUNT_ID = 1000L;

	private static final String _ACCOUNT_ID_SF = "SF-ACCOUNT-1";

	private static final Long _CONTRACT_ID = 9000L;

	private static final String _ENTITLEMENT_ID_1 = "a0P-ENT-1";

	private static final String _ENTITLEMENT_ID_2 = "a0P-ENT-2";

	private static final String _LINE_ITEM_ID_1 = "a0U-LINE-1";

	private static final String _LINE_ITEM_ID_2 = "a0U-LINE-2";

	private static final String _LINE_ITEM_ID_3 = "a0U-LINE-3";

	private static final long _NEW_ORDER_ID = 4000L;

	private static final String _OPPORTUNITY_ID = "006-OPP-1";

	private static final String _PRODUCT_2_ID_1 = "01t-PROD-1";

	private static final String _PRODUCT_2_ID_2 = "01t-PROD-2";

	private static final String _PROJECT_ID_1 = "a0B-PRJ-1";

	private static final String _PROJECT_ID_2 = "a0B-PRJ-2";

	private CommerceOrderItemService _commerceOrderItemService;
	private CommerceOrderService _commerceOrderService;
	private CommerceSkuService _commerceSkuService;
	private EntitlementService _entitlementService;
	private ProjectService _projectService;
	private ProvisioningProjectEntitlementService
		_provisioningProjectEntitlementService;

}