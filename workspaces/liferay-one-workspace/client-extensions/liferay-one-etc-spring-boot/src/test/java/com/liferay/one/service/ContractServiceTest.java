/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.order.client.custom.field.CustomField;
import com.liferay.headless.commerce.admin.order.client.custom.field.CustomValue;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.ContractConstants;
import com.liferay.one.exception.AmbiguousContractChainException;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Entitlement;
import com.liferay.one.salesforce.model.SalesforceContract;
import com.liferay.one.salesforce.model.SalesforceOpportunityLineItem;
import com.liferay.petra.function.transform.TransformUtil;

import java.net.URI;

import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-CONTRACTSERVICE] ContractService")
public class ContractServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_testContractService = new TestContractService();

		ReflectionTestUtils.setField(
			_testContractService, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			_testContractService, "_commerceOrderItemService",
			_commerceOrderItemService);
		ReflectionTestUtils.setField(
			_testContractService, "_commerceOrderService",
			_commerceOrderService);
		ReflectionTestUtils.setField(
			_testContractService, "_entitlementService", _entitlementService);

		Mockito.when(
			_accountService.fetchAccountByExternalReferenceCode(
				ArgumentMatchers.anyString())
		).thenReturn(
			new Account()
		);

		Mockito.doAnswer(
			invocationOnMock -> {
				Map<Long, Map<String, Object>> customFieldValuesMap =
					invocationOnMock.getArgument(0);
				Order order = invocationOnMock.getArgument(1);

				for (OrderItem orderItem : order.getOrderItems()) {
					Map<String, Object> customFieldValues =
						customFieldValuesMap.get(orderItem.getId());

					if (customFieldValues == null) {
						continue;
					}

					_setCustomField(
						orderItem, "contractId",
						customFieldValues.get("contractId"));
				}

				return null;
			}
		).when(
			_commerceOrderItemService
		).patchOrderItemCustomFields(
			ArgumentMatchers.anyMap(), ArgumentMatchers.any(Order.class)
		);
	}

	@Test
	public void testGetContractsFiltersByTheExternalReferenceCodes()
		throws Exception {

		_testContractService.getFunction = uri -> {
			if (_isChainQuery(uri, "externalReferenceCode in ('C''1','C2')")) {
				return _createItemsResponse(
					new JSONObject(
					).put(
						"id", 77
					),
					new JSONObject(
					).put(
						"id", 78
					));
			}

			return null;
		};

		Assertions.assertEquals(
			List.of(77L, 78L),
			TransformUtil.transform(
				_testContractService.getContracts(List.of("C'1", "C2")),
				Contract::getId));
	}

	@Test
	public void testGetContractsSkipsTheQueryWithoutExternalReferenceCodes()
		throws Exception {

		Assertions.assertTrue(
			_testContractService.getContracts(
				new ArrayList<>()
			).isEmpty());

		Assertions.assertTrue(_testContractService.requests.isEmpty());
	}

	@Test
	public void testGetOpportunityContractsFiltersByTheOpportunity()
		throws Exception {

		_testContractService.getFunction = uri -> {
			if (_isOpportunityContractsQuery(uri)) {
				return _createItemsResponse(
					new JSONObject(
					).put(
						"id", 77
					));
			}

			return null;
		};

		Assertions.assertEquals(
			List.of(77L),
			TransformUtil.transform(
				_testContractService.getOpportunityContracts("OPP-1"),
				Contract::getId));
		Assertions.assertTrue(
			_testContractService.getOpportunityContracts(
				""
			).isEmpty());
	}

	@Test
	public void testGetProjectContractsFiltersByTheProject() throws Exception {
		_testContractService.getFunction = uri -> {
			if (_isChainQuery(
					uri, "r_projectToContract_c_projectERC eq 'PRJ''1'")) {

				return _createItemsResponse(
					new JSONObject(
					).put(
						"id", 77
					),
					new JSONObject(
					).put(
						"id", 78
					));
			}

			return null;
		};

		Assertions.assertEquals(
			List.of(77L, 78L),
			TransformUtil.transform(
				_testContractService.getProjectContracts("PRJ'1"),
				Contract::getId));
	}

	@Test
	public void testReconcileOpportunityContractKeepsAnItemThatHasAContract()
		throws Exception {

		_testContractService.getFunction = uri -> {
			if (_isOpportunityContractsQuery(uri)) {
				return _createItemsResponse(
					_createContractJSONObject(
						77, "2027-10-31T00:00:00Z", "2026-11-01T00:00:00Z"));
			}

			return null;
		};

		Order opportunityOrder = _createOrder(
			Map.of("salesforceProjectId", "PRJ-1"),
			_createOrderItem(11, "2027-11-01T00:00:00Z", 5L));

		opportunityOrder.setAccountId(_ACCOUNT_ID);

		_whenFetchOrder(opportunityOrder);

		Mockito.when(
			_commerceOrderService.getAccountOrders(_ACCOUNT_ID)
		).thenReturn(
			List.of(opportunityOrder)
		);

		Mockito.when(
			_entitlementService.getOrderItemEntitlements(List.of(11L))
		).thenReturn(
			List.of(
				_createEntitlement(1, 11, 0, null),
				_createEntitlement(2, 11, 5, "PRJ-2"))
		);

		_testContractService.reconcileOpportunityContract("OPP-1");

		Mockito.verify(
			_commerceOrderItemService
		).patchOrderItemCustomFields(
			Map.of(), opportunityOrder
		);

		Mockito.verify(
			_entitlementService
		).updateEntitlementContract(
			1, 5
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementContract(
			ArgumentMatchers.eq(2L), ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testReconcileOpportunityContractLeavesAnItemWithoutAMatchingContract()
		throws Exception {

		_testContractService.getFunction = uri -> {
			if (_isOpportunityContractsQuery(uri)) {
				return _createItemsResponse(
					_createContractJSONObject(
						77, "2027-10-31T00:00:00Z", "2026-11-01T00:00:00Z"));
			}

			return null;
		};

		Order opportunityOrder = _createOrder(
			Map.of("salesforceProjectId", "PRJ-1"),
			_createOrderItem(11, "2028-11-01T00:00:00Z", 0L));

		opportunityOrder.setAccountId(_ACCOUNT_ID);

		_whenFetchOrder(opportunityOrder);

		Mockito.when(
			_commerceOrderService.getAccountOrders(_ACCOUNT_ID)
		).thenReturn(
			List.of(opportunityOrder)
		);

		Mockito.when(
			_entitlementService.getOrderItemEntitlements(List.of(11L))
		).thenReturn(
			List.of(_createEntitlement(1, 11, 0, null))
		);

		_testContractService.reconcileOpportunityContract("OPP-1");

		Mockito.verify(
			_commerceOrderItemService
		).patchOrderItemCustomFields(
			Map.of(), opportunityOrder
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementContract(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testReconcileOpportunityContractLinksEveryOrderOfTheOpportunity()
		throws Exception {

		_testContractService.getFunction = uri -> {
			if (_isOpportunityContractsQuery(uri)) {
				return _createItemsResponse(
					new JSONObject(
					).put(
						"endDate", "2027-10-31T00:00:00Z"
					).put(
						"id", 77
					).put(
						"opportunityId", "OPP-1"
					).put(
						"startDate", "2026-11-01T00:00:00Z"
					),
					_createContractJSONObject(
						78, "2028-10-31T00:00:00Z", "2027-11-01T00:00:00Z"
					).put(
						"r_accountEntryToContract_accountEntryId", _ACCOUNT_ID
					).put(
						"r_projectToContract_c_projectERC", "PRJ-1"
					));
			}

			return null;
		};

		Order opportunityOrder = _createOrder(
			Map.of("salesforceProjectId", "PRJ-1"),
			_createOrderItem(11, "2027-11-01T00:00:00Z", 0L));

		opportunityOrder.setAccountId(_ACCOUNT_ID);

		_whenFetchOrder(opportunityOrder);

		Order projectEntitlementOrder = _createOrder(
			_PROJECT_ENTITLEMENT_ORDER_ID,
			Map.of(
				"salesforceOpportunityId", "OPP-1", "salesforceProjectId",
				"PRJ-2"),
			_createOrderItem(12, "2028-11-01T00:00:00Z", 0L));
		Order unrelatedOrder = _createOrder(
			_UNRELATED_ORDER_ID, Map.of("salesforceOpportunityId", "OPP-9"),
			_createOrderItem(13, "2027-11-01T00:00:00Z", 0L));

		Mockito.when(
			_commerceOrderService.getAccountOrders(_ACCOUNT_ID)
		).thenReturn(
			List.of(opportunityOrder, projectEntitlementOrder, unrelatedOrder)
		);

		Mockito.when(
			_entitlementService.getOrderItemEntitlements(List.of(11L))
		).thenReturn(
			List.of(_createEntitlement(1, 11, 0, null))
		);

		Mockito.when(
			_entitlementService.getOrderItemEntitlements(List.of(12L))
		).thenReturn(
			List.of(_createEntitlement(3, 12, 0, null))
		);

		_testContractService.reconcileOpportunityContract("OPP-1");

		Assertions.assertEquals(
			List.of("PATCH /o/c/contracts/77", "PATCH /o/c/contracts/77"),
			_testContractService.requests);
		Assertions.assertEquals(
			_ACCOUNT_ID,
			new JSONObject(
				_testContractService.bodies.get(0)
			).getLong(
				"r_accountEntryToContract_accountEntryId"
			));
		Assertions.assertEquals(
			"PRJ-1",
			new JSONObject(
				_testContractService.bodies.get(1)
			).getString(
				"r_projectToContract_c_projectERC"
			));

		Mockito.verify(
			_commerceOrderItemService
		).patchOrderItemCustomFields(
			Map.of(11L, Map.of("contractId", 77L)), opportunityOrder
		);

		Mockito.verify(
			_commerceOrderItemService
		).patchOrderItemCustomFields(
			Map.of(12L, Map.of("contractId", 78L)), projectEntitlementOrder
		);

		Mockito.verify(
			_commerceOrderItemService, Mockito.never()
		).patchOrderItemCustomFields(
			ArgumentMatchers.anyMap(), ArgumentMatchers.same(unrelatedOrder)
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).patchOrderCustomFields(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any()
		);

		Mockito.verify(
			_entitlementService
		).updateEntitlementContract(
			1, 77
		);

		Mockito.verify(
			_entitlementService
		).updateEntitlementContract(
			3, 78
		);

		Mockito.verify(
			_entitlementService
		).updateEntitlementProject(
			1, "PRJ-1"
		);

		Mockito.verify(
			_entitlementService
		).updateEntitlementProject(
			3, "PRJ-2"
		);
	}

	@Test
	public void testReconcileOpportunityContractSkipsUntilTheOpportunityIsProvisioned()
		throws Exception {

		_testContractService.getFunction = uri -> {
			if (_isOpportunityContractsQuery(uri)) {
				return _createItemsResponse(
					new JSONObject(
					).put(
						"id", 77
					));
			}

			return null;
		};

		_testContractService.reconcileOpportunityContract("OPP-1");

		Assertions.assertTrue(_testContractService.requests.isEmpty());

		Mockito.verifyNoInteractions(_commerceOrderItemService);
	}

	@Test
	public void testReconcileOpportunityContractsReconcilesRecentlyModifiedContracts()
		throws Exception {

		_testContractService.getFunction = uri -> {
			String query = uri.getQuery();

			if (query.contains("dateModified ge ")) {
				return _createItemsResponse(
					new JSONObject(
					).put(
						"opportunityId", "OPP-1"
					),
					new JSONObject(
					).put(
						"opportunityId", "OPP-1"
					),
					new JSONObject());
			}

			if (_isOpportunityContractsQuery(uri)) {
				return _createItemsResponse(
					new JSONObject(
					).put(
						"id", 77
					).put(
						"r_accountEntryToContract_accountEntryId", _ACCOUNT_ID
					).put(
						"r_projectToContract_c_projectERC", "PRJ-1"
					));
			}

			return null;
		};

		_whenFetchOrder(_createOrder(Map.of()));

		_testContractService.reconcileOpportunityContracts();

		Assertions.assertTrue(_testContractService.requests.isEmpty());

		Mockito.verify(
			_commerceOrderService
		).fetchOrderByExternalReferenceCode(
			"OPP-1"
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).patchOrderCustomFields(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any()
		);
	}

	@Test
	public void testUpdateEntitlementContractsKeepsTheAIHubOrderContract()
		throws Exception {

		Order order = _createOrder(
			Map.of("order-metadata", "{\"contractEntityId\": 9}"),
			_createOrderItem(11, "2027-11-01T00:00:00Z", 0L));

		Mockito.when(
			_entitlementService.getOrderItemEntitlements(List.of(11L))
		).thenReturn(
			List.of(
				_createEntitlement(1, 11, 9, null),
				_createEntitlement(2, 11, 0, null))
		);

		_testContractService.updateEntitlementContracts(
			order, _createLineItems("L11"), true);

		Mockito.verify(
			_entitlementService
		).updateEntitlementContract(
			2, 9
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementContract(
			ArgumentMatchers.eq(1L), ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testUpdateEntitlementContractsKeepsTheEntitlementsOfAnItemAtZeroWhenNotUnlinking()
		throws Exception {

		Order order = _createOrder(
			Map.of(), _createOrderItem(11, "2027-11-01T00:00:00Z", 0L),
			_createOrderItem(12, "2027-11-01T00:00:00Z", 0L),
			_createOrderItem(13, "2028-11-01T00:00:00Z", 6L));

		Mockito.when(
			_entitlementService.getOrderItemEntitlements(List.of(11L, 13L))
		).thenReturn(
			List.of(
				_createEntitlement(1, 11, 5, null),
				_createEntitlement(2, 13, 0, null))
		);

		_testContractService.updateEntitlementContracts(
			order, _createLineItems("L11", "L13"), false);

		Mockito.verify(
			_entitlementService, Mockito.times(1)
		).updateEntitlementContract(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyLong()
		);

		Mockito.verify(
			_entitlementService
		).updateEntitlementContract(
			2, 6
		);

		Mockito.verify(
			_entitlementService, Mockito.times(1)
		).getOrderItemEntitlements(
			List.of(11L, 13L)
		);
	}

	@Test
	public void testUpdateEntitlementContractsKeepsTheEntitlementsOfAnItemThatTheLinesDoNotCarry()
		throws Exception {

		Order order = _createOrder(
			Map.of(), _createOrderItem(11, "2027-11-01T00:00:00Z", 0L),
			_createOrderItem(12, "2028-11-01T00:00:00Z", 6L));

		Mockito.when(
			_entitlementService.getOrderItemEntitlements(List.of(12L))
		).thenReturn(
			List.of(_createEntitlement(2, 12, 0, null))
		);

		_testContractService.updateEntitlementContracts(
			order, _createLineItems("L12"), true);

		Mockito.verify(
			_entitlementService, Mockito.times(1)
		).getOrderItemEntitlements(
			List.of(12L)
		);

		Mockito.verify(
			_entitlementService, Mockito.times(1)
		).updateEntitlementContract(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyLong()
		);

		Mockito.verify(
			_entitlementService
		).updateEntitlementContract(
			2, 6
		);
	}

	@Test
	public void testUpdateEntitlementContractsLinksTheEntitlementsOfTheItem()
		throws Exception {

		Order order = _createOrder(
			Map.of(), _createOrderItem(11, "2027-11-01T00:00:00Z", 5L),
			_createOrderItem(12, "2028-11-01T00:00:00Z", 6L));

		Mockito.when(
			_entitlementService.getOrderItemEntitlements(List.of(11L, 12L))
		).thenReturn(
			List.of(
				_createEntitlement(1, 11, 0, null),
				_createEntitlement(2, 11, 5, null),
				_createEntitlement(3, 12, 0, null))
		);

		_testContractService.updateEntitlementContracts(
			order, _createLineItems("L11", "L12"), true);

		Mockito.verify(
			_entitlementService
		).updateEntitlementContract(
			1, 5
		);

		Mockito.verify(
			_entitlementService
		).updateEntitlementContract(
			3, 6
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementContract(
			ArgumentMatchers.eq(2L), ArgumentMatchers.anyLong()
		);

		Mockito.verify(
			_entitlementService, Mockito.times(1)
		).getOrderItemEntitlements(
			ArgumentMatchers.anyList()
		);
	}

	@Test
	public void testUpdateEntitlementContractsMovesTheEntitlementsToTheNewContract()
		throws Exception {

		Order order = _createOrder(
			Map.of(), _createOrderItem(11, "2027-11-01T00:00:00Z", 6L));

		Mockito.when(
			_entitlementService.getOrderItemEntitlements(List.of(11L))
		).thenReturn(
			List.of(
				_createEntitlement(1, 11, 5, null),
				_createEntitlement(2, 11, 5, null))
		);

		_testContractService.updateEntitlementContracts(
			order, _createLineItems("L11"), true);

		Mockito.verify(
			_entitlementService
		).updateEntitlementContract(
			1, 6
		);

		Mockito.verify(
			_entitlementService
		).updateEntitlementContract(
			2, 6
		);
	}

	@Test
	public void testUpdateEntitlementContractsSkipsAnOrderWithoutItems()
		throws Exception {

		Order order = _createOrder(Map.of());

		order.setOrderItems((OrderItem[])null);

		_testContractService.updateEntitlementContracts(order, List.of(), true);

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testUpdateEntitlementContractsUnlinksTheEntitlementsOfAnUnlinkedItem()
		throws Exception {

		Order order = _createOrder(
			Map.of(), _createOrderItem(11, "2027-11-01T00:00:00Z", 0L));

		Mockito.when(
			_entitlementService.getOrderItemEntitlements(List.of(11L))
		).thenReturn(
			List.of(
				_createEntitlement(1, 11, 5, null),
				_createEntitlement(2, 11, 0, null))
		);

		_testContractService.updateEntitlementContracts(
			order, _createLineItems("L11"), true);

		Mockito.verify(
			_entitlementService
		).updateEntitlementContract(
			1, 0
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementContract(
			ArgumentMatchers.eq(2L), ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testUpdateEntitlementContractsWritesNothingOnASecondRun()
		throws Exception {

		Order order = _createOrder(
			Map.of(), _createOrderItem(11, "2027-11-01T00:00:00Z", 5L));

		Mockito.when(
			_entitlementService.getOrderItemEntitlements(List.of(11L))
		).thenReturn(
			List.of(_createEntitlement(1, 11, 0, null)),
			List.of(_createEntitlement(1, 11, 5, null))
		);

		_testContractService.updateEntitlementContracts(
			order, _createLineItems("L11"), true);
		_testContractService.updateEntitlementContracts(
			order, _createLineItems("L11"), true);

		Mockito.verify(
			_entitlementService, Mockito.times(1)
		).updateEntitlementContract(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testUpsertContractAttachesSuccessorContract() throws Exception {
		_testContractService.getFunction = uri -> {
			if (_isChainQuery(uri, "opportunityId eq 'OPP-2'")) {
				return _createItemsResponse(
					new JSONObject(
					).put(
						"externalReferenceCode", "C2"
					).put(
						"id", 88
					));
			}

			return null;
		};
		_testContractService.patchResponse = new JSONObject(
		).put(
			"id", 77
		).put(
			"r_projectToContract_c_projectERC", "PRJ-1"
		).toString();

		_testContractService.upsertContract(
			"create",
			_createSalesforceContract().put(
				"SBQQ__RenewalOpportunity__c", "OPP-2"));

		Assertions.assertEquals(
			List.of(
				"PATCH /o/c/contracts/by-external-reference-code/C1",
				"PATCH /o/c/contracts/88"),
			_testContractService.requests);

		JSONObject jsonObject = new JSONObject(
			_testContractService.bodies.get(1));

		Assertions.assertEquals(
			ContractConstants.TYPE_RENEWAL,
			jsonObject.getJSONObject(
				"contractType"
			).getString(
				"key"
			));
		Assertions.assertEquals(
			"C1",
			jsonObject.getString("r_originalContractToContract_c_contractERC"));
		Assertions.assertEquals(
			"PRJ-1", jsonObject.getString("r_projectToContract_c_projectERC"));
	}

	@Test
	public void testUpsertContractCreatesInitialContract() throws Exception {
		_testContractService.patchResponse = "{\"id\": 77}";

		_testContractService.upsertContract(
			"create",
			_createSalesforceContract(
			).put(
				"ContractTerm", 12
			).put(
				"EndDate", "2027-01-31"
			).put(
				"StartDate", "2026-02-01T08:00:00Z"
			));

		Assertions.assertEquals(
			List.of("PATCH /o/c/contracts/by-external-reference-code/C1"),
			_testContractService.requests);

		JSONObject jsonObject = new JSONObject(
			_testContractService.bodies.get(0));

		Assertions.assertEquals(12, jsonObject.getInt("contractTerm"));
		Assertions.assertEquals(
			ContractConstants.TYPE_INITIAL,
			jsonObject.getJSONObject(
				"contractType"
			).getString(
				"key"
			));
		Assertions.assertEquals(
			"2027-01-31T00:00:00Z", jsonObject.getString("endDate"));
		Assertions.assertEquals(
			"C1", jsonObject.getString("externalReferenceCode"));
		Assertions.assertEquals(
			"ACCNT-1",
			jsonObject.getString("r_accountEntryToContract_accountEntryERC"));
		Assertions.assertEquals(
			"2026-02-01T08:00:00Z", jsonObject.getString("startDate"));
		Assertions.assertFalse(jsonObject.has("opportunityId"));
		Assertions.assertFalse(jsonObject.has("renewalOpportunityId"));
		Assertions.assertFalse(
			jsonObject.has("r_projectToContract_c_projectERC"));

		Mockito.verifyNoInteractions(_commerceOrderService);
	}

	@Test
	public void testUpsertContractFallsBackToPutWhenPatchIsNotFound()
		throws Exception {

		_testContractService.patchRuntimeException = _createException(404);
		_testContractService.putResponse = "{\"id\": 77}";

		_testContractService.upsertContract(
			"create", _createSalesforceContract());

		Assertions.assertEquals(
			List.of(
				"PATCH /o/c/contracts/by-external-reference-code/C1",
				"PUT /o/c/contracts/by-external-reference-code/C1"),
			_testContractService.requests);
		Assertions.assertEquals(
			_testContractService.bodies.get(0),
			_testContractService.bodies.get(1));
	}

	@Test
	public void testUpsertContractLinksPredecessorContract() throws Exception {
		_testContractService.getFunction = uri -> {
			if (_isChainQuery(uri, "renewalOpportunityId eq 'OPP-1'")) {
				return _createItemsResponse(
					new JSONObject(
					).put(
						"externalReferenceCode", "C0"
					).put(
						"id", 50
					).put(
						"r_projectToContract_c_projectERC", "PRJ-0"
					));
			}

			return null;
		};
		_testContractService.patchResponse = "{\"id\": 77}";

		_testContractService.upsertContract(
			"create",
			_createSalesforceContract().put("SBQQ__Opportunity__c", "OPP-1"));

		JSONObject jsonObject = new JSONObject(
			_testContractService.bodies.get(0));

		Assertions.assertEquals(
			ContractConstants.TYPE_RENEWAL,
			jsonObject.getJSONObject(
				"contractType"
			).getString(
				"key"
			));
		Assertions.assertEquals("OPP-1", jsonObject.getString("opportunityId"));
		Assertions.assertEquals(
			"C0",
			jsonObject.getString("r_originalContractToContract_c_contractERC"));
		Assertions.assertEquals(
			"PRJ-0", jsonObject.getString("r_projectToContract_c_projectERC"));
	}

	@Test
	public void testUpsertContractOmitsTheAccountUntilItExists()
		throws Exception {

		Mockito.when(
			_accountService.fetchAccountByExternalReferenceCode("ACCNT-1")
		).thenReturn(
			null
		);

		_testContractService.patchResponse = "{\"id\": 77}";

		_testContractService.upsertContract(
			"create", _createSalesforceContract());

		JSONObject jsonObject = new JSONObject(
			_testContractService.bodies.get(0));

		Assertions.assertEquals(
			"C1", jsonObject.getString("externalReferenceCode"));
		Assertions.assertFalse(
			jsonObject.has("r_accountEntryToContract_accountEntryERC"));
	}

	@Test
	public void testUpsertContractReassignsOrderEntitlements()
		throws Exception {

		_testContractService.getFunction = uri -> {
			if (_isOpportunityContractsQuery(uri)) {
				return _createItemsResponse(
					_createContractJSONObject(
						77, "2027-10-31T00:00:00Z", "2026-11-01T00:00:00Z"
					).put(
						"r_projectToContract_c_projectERC", "PRJ-1"
					));
			}

			return _createItemsResponse();
		};
		_testContractService.patchResponse = "{\"id\": 77}";

		Order order = _createOrder(
			Map.of("salesforceProjectId", "PRJ-1"),
			_createOrderItem(11, "2027-11-01T00:00:00Z", 0L));

		_whenFetchOrder(order);

		Mockito.when(
			_entitlementService.getOrderItemEntitlements(List.of(11L))
		).thenReturn(
			List.of(
				_createEntitlement(1, 11, 0, null),
				_createEntitlement(2, 11, 5, "PRJ-2"))
		);

		_testContractService.upsertContract(
			"create",
			_createSalesforceContract().put("SBQQ__Opportunity__c", "OPP-1"));

		JSONObject jsonObject = new JSONObject(
			_testContractService.bodies.get(0));

		Assertions.assertEquals(
			"PRJ-1", jsonObject.getString("r_projectToContract_c_projectERC"));

		Mockito.verify(
			_commerceOrderItemService
		).patchOrderItemCustomFields(
			Map.of(11L, Map.of("contractId", 77L)), order
		);

		Mockito.verify(
			_entitlementService
		).updateEntitlementContract(
			1, 77
		);

		Mockito.verify(
			_entitlementService
		).updateEntitlementProject(
			1, "PRJ-1"
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementContract(
			ArgumentMatchers.eq(2L), ArgumentMatchers.anyLong()
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementProject(
			ArgumentMatchers.eq(2L), ArgumentMatchers.anyString()
		);
	}

	@Test
	public void testUpsertContractRejectsAmbiguousContractChain() {
		_testContractService.getFunction = uri -> new JSONObject(
		).put(
			"items", new JSONArray()
		).put(
			"totalCount", 2
		).toString();

		Assertions.assertThrows(
			AmbiguousContractChainException.class,
			() -> _testContractService.upsertContract(
				"create",
				_createSalesforceContract().put(
					"SBQQ__Opportunity__c", "OPP-1")));

		Assertions.assertTrue(_testContractService.requests.isEmpty());
	}

	@Test
	public void testUpsertContractRethrowsPatchFailure() {
		_testContractService.patchRuntimeException = _createException(500);

		Assertions.assertThrows(
			WebClientResponseException.class,
			() -> _testContractService.upsertContract(
				"create", _createSalesforceContract()));

		Assertions.assertEquals(
			List.of("PATCH /o/c/contracts/by-external-reference-code/C1"),
			_testContractService.requests);
	}

	@Test
	public void testUpsertContractSkipsContractWithoutAccount()
		throws Exception {

		_testContractService.upsertContract(
			"create", _createSalesforceContract().put("AccountId", ""));

		Assertions.assertTrue(_testContractService.requests.isEmpty());

		Mockito.verifyNoInteractions(_commerceOrderService);
	}

	@Test
	public void testUpsertContractUpdateCreatesMissingContract()
		throws Exception {

		_testContractService.getFunction = uri -> {
			throw _createException(404);
		};
		_testContractService.patchResponse = "{\"id\": 77}";

		_testContractService.upsertContract(
			"update", _createSalesforceContract());

		Assertions.assertEquals(
			List.of("PATCH /o/c/contracts/by-external-reference-code/C1"),
			_testContractService.requests);

		JSONObject jsonObject = new JSONObject(
			_testContractService.bodies.get(0));

		Assertions.assertEquals(
			ContractConstants.TYPE_INITIAL,
			jsonObject.getJSONObject(
				"contractType"
			).getString(
				"key"
			));
	}

	@Test
	public void testUpsertContractUpdateKeepsExistingProjectLink()
		throws Exception {

		_testContractService.getFunction = uri -> {
			if (_isExistingContractQuery(uri)) {
				return new JSONObject(
				).put(
					"id", 77
				).put(
					"r_projectToContract_c_projectERC", "PRJ-OLD"
				).toString();
			}

			return _createItemsResponse();
		};
		_testContractService.patchResponse = "{\"id\": 77}";

		_whenFetchOrder(_createOrder(Map.of("salesforceProjectId", "PRJ-1")));

		_testContractService.upsertContract(
			"update",
			_createSalesforceContract().put("SBQQ__Opportunity__c", "OPP-1"));

		JSONObject jsonObject = new JSONObject(
			_testContractService.bodies.get(0));

		Assertions.assertFalse(jsonObject.has("contractType"));
		Assertions.assertFalse(
			jsonObject.has("r_projectToContract_c_projectERC"));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).patchOrderCustomFields(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any()
		);
	}

	@Test
	public void testUpsertContractUpdateLinksMissingProject() throws Exception {
		_testContractService.getFunction = uri -> {
			if (_isExistingContractQuery(uri)) {
				return "{\"id\": 77}";
			}

			return _createItemsResponse();
		};
		_testContractService.patchResponse = "{\"id\": 77}";

		_whenFetchOrder(_createOrder(Map.of("salesforceProjectId", "PRJ-1")));

		_testContractService.upsertContract(
			"update",
			_createSalesforceContract().put("SBQQ__Opportunity__c", "OPP-1"));

		Assertions.assertEquals(
			List.of("PATCH /o/c/contracts/by-external-reference-code/C1"),
			_testContractService.requests);

		JSONObject jsonObject = new JSONObject(
			_testContractService.bodies.get(0));

		Assertions.assertEquals(
			"PRJ-1", jsonObject.getString("r_projectToContract_c_projectERC"));
	}

	private JSONObject _createContractJSONObject(
		long id, String endDate, String startDate) {

		return new JSONObject(
		).put(
			"endDate", endDate
		).put(
			"id", id
		).put(
			"startDate", startDate
		);
	}

	private Entitlement _createEntitlement(
		long entitlementId, long commerceOrderItemId, long contractId,
		String projectExternalReferenceCode) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"id", entitlementId
		).put(
			"r_commerceOrderItemToEntitlement_commerceOrderItemId",
			commerceOrderItemId
		).put(
			"r_contractToEntitlement_c_contractId", contractId
		);

		if (projectExternalReferenceCode != null) {
			jsonObject.put(
				"r_projectToEntitlement_c_projectERC",
				projectExternalReferenceCode);
		}

		return new Entitlement(jsonObject);
	}

	private WebClientResponseException _createException(int statusCode) {
		return WebClientResponseException.create(
			statusCode, "Error", HttpHeaders.EMPTY,
			"error".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
	}

	private String _createItemsResponse(JSONObject... jsonObjects) {
		return new JSONObject(
		).put(
			"items", new JSONArray(jsonObjects)
		).put(
			"totalCount", jsonObjects.length
		).toString();
	}

	private List<SalesforceOpportunityLineItem> _createLineItems(
		String... ids) {

		List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems =
			new ArrayList<>();

		for (String id : ids) {
			salesforceOpportunityLineItems.add(
				new SalesforceOpportunityLineItem(
					new JSONObject(
					).put(
						"Id", id
					)));
		}

		return salesforceOpportunityLineItems;
	}

	private Order _createOrder(
		long orderId, Map<String, String> customFields,
		OrderItem... orderItems) {

		Order order = new Order();

		order.setCustomFields(customFields);
		order.setExternalReferenceCode(String.valueOf(orderId));
		order.setId(orderId);
		order.setOrderItems(orderItems);

		return order;
	}

	private Order _createOrder(
		Map<String, String> customFields, OrderItem... orderItems) {

		Order order = _createOrder(_ORDER_ID, customFields, orderItems);

		order.setExternalReferenceCode("OPP-1");

		return order;
	}

	private OrderItem _createOrderItem(
		long orderItemId, String endDate, long contractId) {

		OrderItem orderItem = new OrderItem();

		orderItem.setExternalReferenceCode("L" + orderItemId);
		orderItem.setId(orderItemId);

		_setCustomField(orderItem, "contractId", contractId);
		_setCustomField(orderItem, "endDate", endDate);

		return orderItem;
	}

	private JSONObject _createSalesforceContract() {
		return new JSONObject(
		).put(
			"AccountId", "ACCNT-1"
		).put(
			"Id", "C1"
		);
	}

	private boolean _isChainQuery(URI uri, String filter) {
		String query = uri.getQuery();

		if (Objects.equals(uri.getPath(), "/o/c/contracts") &&
			(query != null) && query.contains(filter)) {

			return true;
		}

		return false;
	}

	private boolean _isExistingContractQuery(URI uri) {
		return Objects.equals(
			uri.getPath(), "/o/c/contracts/by-external-reference-code/C1");
	}

	private boolean _isOpportunityContractsQuery(URI uri) {
		return _isChainQuery(uri, "filter=opportunityId eq 'OPP-1'");
	}

	private void _setCustomField(
		OrderItem orderItem, String name, Object data) {

		List<CustomField> customFields = new ArrayList<>();

		CustomField[] existingCustomFields = orderItem.getCustomFields();

		if (existingCustomFields != null) {
			for (CustomField customField : existingCustomFields) {
				if (name.equals(customField.getName())) {
					continue;
				}

				customFields.add(customField);
			}
		}

		CustomValue customValue = new CustomValue();

		customValue.setData(data);

		CustomField customField = new CustomField();

		customField.setCustomValue(customValue);
		customField.setName(name);

		customFields.add(customField);

		orderItem.setCustomFields(customFields.toArray(new CustomField[0]));
	}

	private void _whenFetchOrder(Order order) throws Exception {
		Mockito.when(
			_commerceOrderService.fetchOrderByExternalReferenceCode("OPP-1")
		).thenReturn(
			order
		);
	}

	private static final long _ACCOUNT_ID = 5L;

	private static final long _ORDER_ID = 900L;

	private static final long _PROJECT_ENTITLEMENT_ORDER_ID = 901L;

	private static final long _UNRELATED_ORDER_ID = 902L;

	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final CommerceOrderItemService _commerceOrderItemService =
		Mockito.mock(CommerceOrderItemService.class);
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private TestContractService _testContractService;

	private static class TestContractService extends ContractService {

		public void upsertContract(String action, JSONObject jsonObject)
			throws Exception {

			upsertContract(action, new SalesforceContract(jsonObject));
		}

		public final List<String> bodies = new ArrayList<>();
		public Function<URI, String> getFunction = uri -> null;
		public String patchResponse;
		public RuntimeException patchRuntimeException;
		public String putResponse;
		public final List<String> requests = new ArrayList<>();

		@Override
		protected String get(String authorization, URI uri) {
			return getFunction.apply(uri);
		}

		@Override
		protected String getAuthorization() {
			return "Bearer test";
		}

		@Override
		protected String patch(String authorization, String body, URI uri) {
			_record("PATCH", body, uri);

			if (patchRuntimeException != null) {
				RuntimeException runtimeException = patchRuntimeException;

				patchRuntimeException = null;

				throw runtimeException;
			}

			return patchResponse;
		}

		@Override
		protected String put(String authorization, String body, URI uri) {
			_record("PUT", body, uri);

			return putResponse;
		}

		private void _record(String method, String body, URI uri) {
			bodies.add(body);
			requests.add(method + " " + uri.getPath());
		}

	}

}