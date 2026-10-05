/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.ContractConstants;
import com.liferay.one.exception.AmbiguousContractChainException;
import com.liferay.one.exception.NoSuchContractException;
import com.liferay.one.model.Entitlement;
import com.liferay.one.salesforce.model.SalesforceContract;

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
	public void setUp() {
		_testContractService = new TestContractService();

		ReflectionTestUtils.setField(
			_testContractService, "_commerceOrderService",
			_commerceOrderService);
		ReflectionTestUtils.setField(
			_testContractService, "_entitlementService", _entitlementService);
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
	public void testUpsertContractReassignsOrderEntitlements()
		throws Exception {

		_testContractService.getFunction = uri -> _createItemsResponse();
		_testContractService.patchResponse = "{\"id\": 77}";

		_whenFetchOrder(
			_createOrder(
				Map.of("contractId", "5", "salesforceProjectId", "PRJ-1"),
				11L));

		Mockito.when(
			_entitlementService.getEntitlements(
				"r_commerceOrderItemToEntitlement_commerceOrderItemId eq '11'")
		).thenReturn(
			List.of(
				_createEntitlement(1, 0, null),
				_createEntitlement(2, 5, "PRJ-2"))
		);

		_testContractService.upsertContract(
			"create",
			_createSalesforceContract().put("SBQQ__Opportunity__c", "OPP-1"));

		JSONObject jsonObject = new JSONObject(
			_testContractService.bodies.get(0));

		Assertions.assertEquals(
			"PRJ-1", jsonObject.getString("r_projectToContract_c_projectERC"));

		Mockito.verify(
			_commerceOrderService
		).patchOrderCustomFields(
			_ORDER_ID, Map.of("contractId", 77L)
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

		_whenFetchOrder(
			_createOrder(
				Map.of("contractId", "77", "salesforceProjectId", "PRJ-1")));

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

	@Test
	public void testUpsertContractUpdateThrowsWhenContractIsMissing() {
		_testContractService.getFunction = uri -> {
			throw _createException(404);
		};

		Assertions.assertThrows(
			NoSuchContractException.class,
			() -> _testContractService.upsertContract(
				"update", _createSalesforceContract()));

		Assertions.assertTrue(_testContractService.requests.isEmpty());
	}

	private Entitlement _createEntitlement(
		long entitlementId, long contractId,
		String projectExternalReferenceCode) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"id", entitlementId
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

	private Order _createOrder(
		Map<String, String> customFields, Long... orderItemIds) {

		Order order = new Order();

		order.setCustomFields(customFields);
		order.setId(_ORDER_ID);

		OrderItem[] orderItems = new OrderItem[orderItemIds.length];

		for (int i = 0; i < orderItemIds.length; i++) {
			OrderItem orderItem = new OrderItem();

			orderItem.setId(orderItemIds[i]);

			orderItems[i] = orderItem;
		}

		order.setOrderItems(orderItems);

		return order;
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

	private void _whenFetchOrder(Order order) throws Exception {
		Mockito.when(
			_commerceOrderService.fetchOrderByExternalReferenceCode("OPP-1")
		).thenReturn(
			order
		);
	}

	private static final long _ORDER_ID = 900L;

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