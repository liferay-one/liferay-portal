/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.order.client.custom.field.CustomField;
import com.liferay.headless.commerce.admin.order.client.custom.field.CustomValue;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.constants.CommerceOrderItemConstants;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.OveragePricing;
import com.liferay.one.util.KeyedLock;

import java.math.BigDecimal;

import java.net.URI;

import java.time.Instant;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Veloso
 */
@DisplayName("[SVC-ENTITLEMENTSERVICE] EntitlementService")
public class EntitlementServiceTest {

	@BeforeEach
	public void setUp() {
		_entitlementService = Mockito.spy(
			new EntitlementService() {

				@Override
				protected String getAuthorization() {
					return "Bearer test";
				}

				@Override
				protected String patch(
					String authorization, String body, URI uri) {

					_patchBodies.add(body);
					_patchURIs.add(uri);

					return "{}";
				}

			});

		ReflectionTestUtils.setField(
			_entitlementService, "_commerceOrderItemService",
			_commerceOrderItemService);
		ReflectionTestUtils.setField(
			_entitlementService, "_commerceOrderService",
			_commerceOrderService);
		ReflectionTestUtils.setField(
			_entitlementService, "_entitlementDefinitionService",
			_entitlementDefinitionService);
		ReflectionTestUtils.setField(
			_entitlementService, "_keyedLock", new KeyedLock());
		ReflectionTestUtils.setField(
			_entitlementService,
			"_selfServiceTrialCustomerLicenseKeyDurationDays", 90);
	}

	@Test
	public void testGenerateEntitlementsAddsTrialAfterCanceledTrialOrderOfTheSameType()
		throws Exception {

		_setUpLicenseKeyDurationDaysOrder(30, "CMP_TRIAL");

		Mockito.doReturn(
			false
		).when(
			_entitlementService
		).isCustomer(
			_ACCOUNT_ID
		);

		_setUpOtherTrialOrder(
			_ORDER_ID - 1, CommerceOrderConstants.ORDER_STATUS_CANCELLED,
			"CMP_TRIAL");

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		_verifyAddEntitlement(30);
	}

	@Test
	public void testGenerateEntitlementsAddsTrialAfterTrialOfAnotherType()
		throws Exception {

		_setUpLicenseKeyDurationDaysOrder(30, "DSR_TRIAL");

		Mockito.doReturn(
			false
		).when(
			_entitlementService
		).isCustomer(
			_ACCOUNT_ID
		);

		_setUpOtherTrialOrder(
			_ORDER_ID - 1, CommerceOrderConstants.ORDER_STATUS_COMPLETED,
			"CMP_TRIAL");

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		_verifyAddEntitlement(30);
	}

	@Test
	public void testGenerateEntitlementsAddsTrialBeforeLaterTrialOrderOfTheSameType()
		throws Exception {

		_setUpLicenseKeyDurationDaysOrder(30, "CMP_TRIAL");

		Mockito.doReturn(
			false
		).when(
			_entitlementService
		).isCustomer(
			_ACCOUNT_ID
		);

		_setUpOtherTrialOrder(
			_ORDER_ID + 1, CommerceOrderConstants.ORDER_STATUS_OPEN,
			"CMP_TRIAL");

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		_verifyAddEntitlement(30);
	}

	@Test
	public void testGenerateEntitlementsAddsTrialEntitlementAgainForSameOrderItem()
		throws Exception {

		_setUpLicenseKeyDurationDaysOrder(30, "CMP_TRIAL");

		Mockito.doReturn(
			false
		).when(
			_entitlementService
		).isCustomer(
			_ACCOUNT_ID
		);

		_setUpEntitlements(_createEntitlementWithOrderItem(_ORDER_ITEM_ID));

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		_verifyAddEntitlement(30);
	}

	@Test
	public void testGenerateEntitlementsAddsTrialEntitlementOfItsOwnOrder()
		throws Exception {

		_setUpLicenseKeyDurationDaysOrder(30, "CMP_TRIAL");

		Mockito.doReturn(
			false
		).when(
			_entitlementService
		).isCustomer(
			_ACCOUNT_ID
		);

		Order order = new Order();

		order.setId(_ORDER_ID);
		order.setOrderTypeExternalReferenceCode("CMP_TRIAL");

		Mockito.when(
			_commerceOrderService.getOrders(Mockito.anyString())
		).thenReturn(
			List.of(order)
		);

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		_verifyAddEntitlement(30);
	}

	@Test
	public void testGenerateEntitlementsCopiesNoLicenseKeyDurationDaysOutsideTrial()
		throws Exception {

		_setUpLicenseKeyDurationDaysOrder(30, "DXP");

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		_verifyAddEntitlement(0);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).isCustomer(
			Mockito.anyLong()
		);
	}

	@Test
	public void testGenerateEntitlementsCopiesTheDefinitionOveragePricing()
		throws Exception {

		_setUpOrderItem(_createOrderItem());

		EntitlementDefinition entitlementDefinition = new EntitlementDefinition(
			new JSONObject(
			).put(
				"defaultQuantity", 1000000.0
			).put(
				"grantType", "fixed"
			).put(
				"id", 1L
			).put(
				"name", "events"
			).put(
				"overageRate", 20.0
			).put(
				"overageSkuExternalReferenceCode",
				"PRDCT-DATA-PLATFORM-EVENTS-OVERAGE-BUCKET"
			));

		Mockito.when(
			_entitlementDefinitionService.getEntitlementDefinitions(
				Mockito.anyMap(), Mockito.anyString())
		).thenReturn(
			List.of(entitlementDefinition)
		);

		Mockito.doReturn(
			_createEntitlement(1, "events")
		).when(
			_entitlementService
		).addEntitlement(
			Mockito.anyLong(), Mockito.anyLong(), Mockito.anyLong(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		Mockito.verify(
			_entitlementService
		).addEntitlement(
			Mockito.anyLong(), Mockito.anyLong(), Mockito.anyLong(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
			Mockito.any(), Mockito.any(),
			Mockito.eq(entitlementDefinition.getOveragePricing()),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any()
		);
	}

	@Test
	public void testGenerateEntitlementsCopiesTheOverageSkuWithoutRate()
		throws Exception {

		_setUpOrderItem(_createOrderItem());

		EntitlementDefinition entitlementDefinition = new EntitlementDefinition(
			new JSONObject(
			).put(
				"defaultQuantity", 7.0
			).put(
				"grantType", "fixed"
			).put(
				"id", 1L
			).put(
				"name", "extensions-vcpus"
			).put(
				"overageSkuExternalReferenceCode",
				"PRDCT-PAAS-EXTENSIONS-VCPUS-OVERAGE"
			));

		Mockito.when(
			_entitlementDefinitionService.getEntitlementDefinitions(
				Mockito.anyMap(), Mockito.anyString())
		).thenReturn(
			List.of(entitlementDefinition)
		);

		Mockito.doReturn(
			_createEntitlement(1, "extensions-vcpus")
		).when(
			_entitlementService
		).addEntitlement(
			Mockito.anyLong(), Mockito.anyLong(), Mockito.anyLong(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		ArgumentCaptor<OveragePricing> overagePricingArgumentCaptor =
			ArgumentCaptor.forClass(OveragePricing.class);

		Mockito.verify(
			_entitlementService
		).addEntitlement(
			Mockito.anyLong(), Mockito.anyLong(), Mockito.anyLong(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
			Mockito.any(), Mockito.any(),
			overagePricingArgumentCaptor.capture(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);

		OveragePricing overagePricing = overagePricingArgumentCaptor.getValue();

		Assertions.assertNull(overagePricing.getRate());
		Assertions.assertEquals(
			"PRDCT-PAAS-EXTENSIONS-VCPUS-OVERAGE",
			overagePricing.getSkuExternalReferenceCode());
	}

	@Test
	public void testGenerateEntitlementsGrantsTheDefinitionQuantityForTrial()
		throws Exception {

		_setUpLicenseKeyDurationDaysOrder(30, "CMP_TRIAL");

		Mockito.when(
			_entitlementDefinitionService.getEntitlementDefinitions(
				Mockito.anyMap(), Mockito.anyString())
		).thenReturn(
			List.of(
				new EntitlementDefinition(
					new JSONObject(
					).put(
						"defaultQuantity", 3.0
					).put(
						"grantType", "fixed"
					).put(
						"id", 1L
					).put(
						"licenseKeyDurationDays", 30
					).put(
						"name", "cmp-trial"
					)))
		);

		Mockito.doReturn(
			false
		).when(
			_entitlementService
		).isCustomer(
			_ACCOUNT_ID
		);

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		Mockito.verify(
			_entitlementService
		).addEntitlement(
			Mockito.anyLong(), Mockito.anyLong(), Mockito.anyLong(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.eq(3.0), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testGenerateEntitlementsKeepsLongerDefinitionDurationForCustomerTrial()
		throws Exception {

		_setUpLicenseKeyDurationDaysOrder(120, "CMP_TRIAL");

		Mockito.doReturn(
			true
		).when(
			_entitlementService
		).isCustomer(
			_ACCOUNT_ID
		);

		_setUpEntitlements();

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		_verifyAddEntitlement(120);
	}

	@Test
	public void testGenerateEntitlementsKeepsTheDefinitionDurationForProspectTrial()
		throws Exception {

		_setUpLicenseKeyDurationDaysOrder(30, "CMP_TRIAL");

		Mockito.doReturn(
			false
		).when(
			_entitlementService
		).isCustomer(
			_ACCOUNT_ID
		);

		_setUpEntitlements();

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		_verifyAddEntitlement(30);
	}

	@Test
	public void testGenerateEntitlementsMatchesDefinitionsBySku()
		throws Exception {

		_setUpOrderItem(_createOrderItem());

		Mockito.when(
			_entitlementDefinitionService.getEntitlementDefinitions(
				Mockito.anyMap(), Mockito.eq(_SKU_EXTERNAL_REFERENCE_CODE))
		).thenReturn(
			List.of(_createEntitlementDefinition(100.0, 1, "storage"))
		);

		Order order = new Order();

		order.setAccountId(_ACCOUNT_ID);
		order.setCustomFields(
			Map.of(
				"contractId", _CONTRACT_ID, "salesforceProjectId",
				_PROJECT_EXTERNAL_REFERENCE_CODE));

		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(_ORDER_ID)
		).thenReturn(
			order
		);

		Mockito.doReturn(
			_createEntitlement(1, "storage")
		).when(
			_entitlementService
		).addEntitlement(
			Mockito.anyLong(), Mockito.anyLong(), Mockito.anyLong(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		Mockito.verify(
			_entitlementService
		).addEntitlement(
			Mockito.eq(_ACCOUNT_ID), Mockito.eq(_ORDER_ITEM_ID),
			Mockito.eq(_CONTRACT_ID), Mockito.eq(1L), Mockito.isNull(),
			Mockito.eq("fixed"), Mockito.eq(0), Mockito.isNull(),
			Mockito.eq("storage"), Mockito.isNull(), Mockito.eq(Map.of()),
			Mockito.eq(_PROJECT_EXTERNAL_REFERENCE_CODE), Mockito.eq(200.0),
			Mockito.eq(_SKU_EXTERNAL_REFERENCE_CODE), Mockito.isNull()
		);
	}

	@Test
	public void testGenerateEntitlementsPassesTheOrderItemOptions()
		throws Exception {

		OrderItem orderItem = _createOrderItem();

		orderItem.setOptions(
			"[{\"key\": \"machineType\", \"value\": [\"small\"]}]");

		_setUpOrderItem(orderItem);

		Order order = new Order();

		order.setAccountId(_ACCOUNT_ID);
		order.setCustomFields(
			Map.of(
				"contractId", _CONTRACT_ID, "salesforceProjectId",
				_PROJECT_EXTERNAL_REFERENCE_CODE));

		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(_ORDER_ID)
		).thenReturn(
			order
		);

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		Mockito.verify(
			_entitlementDefinitionService
		).getEntitlementDefinitions(
			Map.of("machinetype", "small"), _SKU_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testGenerateEntitlementsRethrowsAFailedTrialEntitlement()
		throws Exception {

		_setUpLicenseKeyDurationDaysOrder(30, "CMP_TRIAL");

		Mockito.doReturn(
			false
		).when(
			_entitlementService
		).isCustomer(
			_ACCOUNT_ID
		);

		Exception exception = new Exception("Unable to add entitlement");

		Mockito.doThrow(
			exception
		).when(
			_entitlementService
		).addEntitlement(
			Mockito.anyLong(), Mockito.anyLong(), Mockito.anyLong(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);

		Assertions.assertSame(
			exception,
			Assertions.assertThrows(
				Exception.class,
				() -> _entitlementService.generateEntitlements(
					_ORDER_ITEM_ID)));
	}

	@Test
	public void testGenerateEntitlementsSkipsCanceledOrderItem()
		throws Exception {

		OrderItem orderItem = _createOrderItem();

		CustomValue customValue = new CustomValue();

		customValue.setData(CommerceOrderItemConstants.STATUS_CANCELED);

		CustomField customField = new CustomField();

		customField.setCustomValue(customValue);
		customField.setName("customStatus");

		orderItem.setCustomFields(new CustomField[] {customField});

		_setUpOrderItem(orderItem);

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		Mockito.verifyNoInteractions(_entitlementDefinitionService);
		Mockito.verifyNoInteractions(_commerceOrderService);
	}

	@Test
	public void testGenerateEntitlementsSkipsEarlierTrialOrderOfTheSameType()
		throws Exception {

		_setUpLicenseKeyDurationDaysOrder(30, "DSR_TRIAL");

		_setUpOtherTrialOrder(
			_ORDER_ID - 1, CommerceOrderConstants.ORDER_STATUS_OPEN,
			"DSR_TRIAL");

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).addEntitlement(
			Mockito.anyLong(), Mockito.anyLong(), Mockito.anyLong(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);

		Mockito.verify(
			_commerceOrderService
		).getOrders(
			"accountId/any(x:x eq " + _ACCOUNT_ID +
				") and orderTypeExternalReferenceCode eq 'DSR_TRIAL'"
		);
	}

	@Test
	public void testGenerateEntitlementsSkipsOrderItemWithoutDefinitions()
		throws Exception {

		_setUpOrderItem(_createOrderItem());

		Mockito.when(
			_entitlementDefinitionService.getEntitlementDefinitions(
				Mockito.anyMap(), Mockito.anyString())
		).thenReturn(
			new ArrayList<>()
		);

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		Mockito.verifyNoInteractions(_commerceOrderService);
		Mockito.verify(
			_entitlementService, Mockito.never()
		).addEntitlement(
			Mockito.anyLong(), Mockito.anyLong(), Mockito.anyLong(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testGenerateEntitlementsUsesTheCustomerDurationForCustomerTrial()
		throws Exception {

		_setUpLicenseKeyDurationDaysOrder(30, "CMP_TRIAL");

		Mockito.doReturn(
			true
		).when(
			_entitlementService
		).isCustomer(
			_ACCOUNT_ID
		);

		_setUpEntitlements();

		_entitlementService.generateEntitlements(_ORDER_ITEM_ID);

		_verifyAddEntitlement(90);
	}

	@Test
	public void testGetActiveEntitlementDefinitionsDedupesSharedDefinition()
		throws Exception {

		_setUpEntitlements(
			_createEntitlement(1, "sites"), _createEntitlement(1, "sites"),
			_createEntitlement(2, "logs"));

		Assertions.assertEquals(
			List.of(1L, 2L),
			_getEntitlementDefinitionIds(
				_entitlementService.
					getActiveEntitlementDefinitionsExcludingSelfServiceTrials(
						_ACCOUNT_ID)));
	}

	@Test
	public void testGetActiveEntitlementDefinitionsExcludingSelfServiceTrialsSkipsTrials()
		throws Exception {

		_setUpEntitlements(
			_createEntitlement(1, "storage"),
			new Entitlement(
				new JSONObject(
				).put(
					"entitlementDefinitionToEntitlement",
					new JSONObject(
					).put(
						"id", 2
					)
				).put(
					"id", 2
				).put(
					"licenseKeyDurationDays", 30
				)));

		List<EntitlementDefinition> entitlementDefinitions =
			_entitlementService.
				getActiveEntitlementDefinitionsExcludingSelfServiceTrials(
					_ACCOUNT_ID);

		Assertions.assertEquals(1, entitlementDefinitions.size());

		EntitlementDefinition entitlementDefinition =
			entitlementDefinitions.get(0);

		Assertions.assertEquals(
			1, entitlementDefinition.getEntitlementDefinitionId());
	}

	@Test
	public void testGetActiveEntitlementDefinitionsPreservesEncounterOrder()
		throws Exception {

		_setUpEntitlements(
			_createEntitlement(3, "logs"), _createEntitlement(1, "sites"),
			_createEntitlement(2, "storage"));

		Assertions.assertEquals(
			List.of(3L, 1L, 2L),
			_getEntitlementDefinitionIds(
				_entitlementService.
					getActiveEntitlementDefinitionsExcludingSelfServiceTrials(
						_ACCOUNT_ID)));
	}

	@Test
	public void testGetActiveEntitlementDefinitionsReadsNestedDefinition()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, "storage"));

		List<EntitlementDefinition> entitlementDefinitions =
			_entitlementService.
				getActiveEntitlementDefinitionsExcludingSelfServiceTrials(
					_ACCOUNT_ID);

		Assertions.assertEquals(1, entitlementDefinitions.size());

		EntitlementDefinition entitlementDefinition =
			entitlementDefinitions.get(0);

		Assertions.assertEquals(
			1, entitlementDefinition.getEntitlementDefinitionId());
		Assertions.assertEquals("TiB", entitlementDefinition.getUnit());
	}

	@Test
	public void testGetActiveEntitlementDefinitionsSkipsUnnestedDefinition()
		throws Exception {

		_setUpEntitlements(
			_createEntitlementWithoutDefinition(1, "sites"),
			_createEntitlement(2, "logs"));

		Assertions.assertEquals(
			List.of(2L),
			_getEntitlementDefinitionIds(
				_entitlementService.
					getActiveEntitlementDefinitionsExcludingSelfServiceTrials(
						_ACCOUNT_ID)));
	}

	@Test
	public void testGetActiveSelfServiceTrialEntitlementsKeepsEntitlementsWithADuration()
		throws Exception {

		ArgumentCaptor<String> filterCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.doReturn(
			List.of(
				new Entitlement(
					new JSONObject(
					).put(
						"id", 1L
					).put(
						"licenseKeyDurationDays", 30
					)),
				new Entitlement(
					new JSONObject(
					).put(
						"id", 2L
					)))
		).when(
			_entitlementService
		).getEntitlements(
			filterCaptor.capture()
		);

		List<Entitlement> entitlements =
			_entitlementService.getActiveSelfServiceTrialEntitlements(
				_ACCOUNT_ID);

		Assertions.assertEquals(1, entitlements.size());

		Entitlement entitlement = entitlements.get(0);

		Assertions.assertEquals(1L, entitlement.getEntitlementId());

		String filter = filterCaptor.getValue();

		Assertions.assertFalse(
			filter.contains("licenseKeyDurationDays"), filter);
		Assertions.assertTrue(
			filter.contains("(r_contractToEntitlement_c_contractId eq '0')"),
			filter);
		Assertions.assertTrue(
			filter.contains("(r_projectToEntitlement_c_projectId eq '0')"),
			filter);
	}

	@Test
	public void testGetActiveUnassignedEntitlementsFiltersByAccountWithoutProject()
		throws Exception {

		ArgumentCaptor<String> filterCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			_entitlementService
		).getAllItems(
			Mockito.anyString(), filterCaptor.capture(), Mockito.any(),
			Mockito.anyString()
		);

		_entitlementService.getActiveUnassignedEntitlements(77L);

		String filter = filterCaptor.getValue();

		Assertions.assertTrue(
			filter.contains(
				"((r_accountEntryToEntitlement_accountEntryId eq '77') and " +
					"(r_projectToEntitlement_c_projectId eq '0'))"),
			filter);
		Assertions.assertTrue(filter.contains("endDate eq null"), filter);
		Assertions.assertTrue(filter.contains("startDate eq null"), filter);
	}

	@Test
	public void testGetEntitlementsRequestsNestedEntitlementDefinition()
		throws Exception {

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			_entitlementService
		).getAllItems(
			Mockito.anyString(), Mockito.anyString(), Mockito.any(),
			Mockito.anyString()
		);

		_entitlementService.getEntitlements("name eq 'sites'");

		Mockito.verify(
			_entitlementService
		).getAllItems(
			Mockito.eq("/o/c/entitlements"), Mockito.eq("name eq 'sites'"),
			Mockito.any(), Mockito.eq("entitlementDefinitionToEntitlement")
		);
	}

	@Test
	public void testIsCustomerFiltersActiveAccountEntitlements()
		throws Exception {

		ArgumentCaptor<String> filterCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			_entitlementService
		).getAllProjectedItems(
			Mockito.eq("/o/c/entitlements"),
			Mockito.eq(
				"id,r_contractToEntitlement_c_contractId,terminationStatus"),
			filterCaptor.capture(), Mockito.any()
		);

		_entitlementService.isCustomer(_ACCOUNT_ID);

		String filter = filterCaptor.getValue();

		Assertions.assertTrue(
			filter.contains(
				"(r_accountEntryToEntitlement_accountEntryId eq '" +
					_ACCOUNT_ID + "')"),
			filter);
		Assertions.assertTrue(
			filter.contains("(r_contractToEntitlement_c_contractId ne '0')"),
			filter);
		Assertions.assertTrue(filter.contains("endDate eq null"), filter);
		Assertions.assertFalse(filter.contains("startDate"), filter);
	}

	@Test
	public void testIsCustomerWithContract() throws Exception {
		_setUpCustomerEntitlements(
			_createEntitlementWithContract(0, null),
			_createEntitlementWithContract(_CONTRACT_ID, null));

		Assertions.assertTrue(_entitlementService.isCustomer(_ACCOUNT_ID));
	}

	@Test
	public void testIsCustomerWithSuspendedContract() throws Exception {
		_setUpCustomerEntitlements(
			_createEntitlementWithContract(
				_CONTRACT_ID,
				EntitlementConstants.TERMINATION_STATUS_SUSPENDED));

		Assertions.assertTrue(_entitlementService.isCustomer(_ACCOUNT_ID));
	}

	@Test
	public void testIsCustomerWithTerminatedContract() throws Exception {
		_setUpCustomerEntitlements(
			_createEntitlementWithContract(
				_CONTRACT_ID,
				EntitlementConstants.TERMINATION_STATUS_TERMINATED));

		Assertions.assertFalse(_entitlementService.isCustomer(_ACCOUNT_ID));
	}

	@Test
	public void testIsCustomerWithoutContract() throws Exception {
		_setUpCustomerEntitlements(_createEntitlementWithContract(0, null));

		Assertions.assertFalse(_entitlementService.isCustomer(_ACCOUNT_ID));
	}

	@Test
	public void testIsCustomerWithoutEntitlements() throws Exception {
		_setUpCustomerEntitlements();

		Assertions.assertFalse(_entitlementService.isCustomer(_ACCOUNT_ID));
	}

	@Test
	public void testUpdateEntitlementDatesClearsMissingDates()
		throws Exception {

		_entitlementService.updateEntitlementDates(
			null, 11, Instant.parse("2026-10-15T00:00:00Z"));

		Assertions.assertEquals(1, _patchBodies.size());

		JSONObject jsonObject = new JSONObject(_patchBodies.get(0));

		Assertions.assertTrue(jsonObject.has("endDate"));
		Assertions.assertTrue(jsonObject.isNull("endDate"));
		Assertions.assertEquals(
			"2026-10-15T00:00:00Z", jsonObject.getString("startDate"));
	}

	@Test
	public void testUpdateEntitlementDatesPatchesEndDateAndStartDate()
		throws Exception {

		_entitlementService.updateEntitlementDates(
			Instant.parse("2026-11-14T00:00:00Z"), 11,
			Instant.parse("2026-10-15T00:00:00Z"));

		Assertions.assertEquals(
			List.of(URI.create("/o/c/entitlements/11")), _patchURIs);
		Assertions.assertEquals(1, _patchBodies.size());

		JSONObject jsonObject = new JSONObject(_patchBodies.get(0));

		Assertions.assertEquals(
			"2026-11-14T00:00:00Z", jsonObject.getString("endDate"));
		Assertions.assertEquals(
			"2026-10-15T00:00:00Z", jsonObject.getString("startDate"));
		Assertions.assertEquals(2, jsonObject.length());
	}

	@Test
	public void testUpdateEntitlementsKeepsQuantityWithoutDefinition()
		throws Exception {

		_setUpOrderItem(_createOrderItem());

		Mockito.doReturn(
			List.of(_createEntitlementWithQuantity(11, null, 100.0))
		).when(
			_entitlementService
		).getEntitlements(
			_ORDER_ITEM_ID
		);

		_entitlementService.updateEntitlements(_ORDER_ITEM_ID);

		Assertions.assertTrue(_patchBodies.isEmpty());
	}

	@Test
	public void testUpdateEntitlementsPatchesOnlyEntitlementsOfItsOrderItem()
		throws Exception {

		OrderItem orderItem = _createOrderItem();

		orderItem.setCustomFields(
			new CustomField[] {
				_createCustomField("effectiveEndDate", "2030-01-01T00:00:00Z"),
				_createCustomField("startDate", "2030-01-01T00:00:00Z")
			});

		_setUpOrderItem(orderItem);

		Mockito.doReturn(
			List.of(
				_createEntitlementWithDates(
					11, "2026-01-01T00:00:00Z", "2026-12-31T00:00:00Z"))
		).when(
			_entitlementService
		).getEntitlements(
			_ORDER_ITEM_ID
		);

		Mockito.doReturn(
			List.of(
				_createEntitlementWithDates(
					12, "2026-01-01T00:00:00Z", "2026-12-31T00:00:00Z"))
		).when(
			_entitlementService
		).getEntitlements(
			_ORDER_ITEM_ID + 1
		);

		_entitlementService.updateEntitlements(_ORDER_ITEM_ID);

		Mockito.verify(
			_entitlementService
		).getEntitlements(
			_ORDER_ITEM_ID
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).getEntitlements(
			_ORDER_ITEM_ID + 1
		);

		Assertions.assertEquals(
			List.of(URI.create("/o/c/entitlements/11")), _patchURIs);
		Assertions.assertEquals(1, _patchBodies.size());
	}

	@Test
	public void testUpdateEntitlementsSyncsQuantity() throws Exception {
		_setUpOrderItem(_createOrderItem());

		Mockito.doReturn(
			List.of(
				_createEntitlementWithQuantity(11, 100.0, 100.0),
				_createEntitlementWithQuantity(12, 100.0, 200.0))
		).when(
			_entitlementService
		).getEntitlements(
			_ORDER_ITEM_ID
		);

		_entitlementService.updateEntitlements(_ORDER_ITEM_ID);

		Assertions.assertEquals(
			List.of(URI.create("/o/c/entitlements/11")), _patchURIs);
		Assertions.assertEquals(1, _patchBodies.size());

		JSONObject jsonObject = new JSONObject(_patchBodies.get(0));

		Assertions.assertEquals(200.0, jsonObject.getDouble("quantity"));
		Assertions.assertEquals(1, jsonObject.length());
	}

	@Test
	public void testUpdateEntitlementsTrimsCanceledOrderItem()
		throws Exception {

		OrderItem orderItem = _createOrderItem();

		orderItem.setCustomFields(
			new CustomField[] {
				_createCustomField(
					"customStatus", CommerceOrderItemConstants.STATUS_CANCELED),
				_createCustomField("effectiveEndDate", "2026-01-01T00:00:00Z")
			});

		_setUpOrderItem(orderItem);

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			_entitlementService
		).getEntitlements(
			_ORDER_ITEM_ID
		);

		_entitlementService.updateEntitlements(_ORDER_ITEM_ID);

		Mockito.verify(
			_entitlementService
		).getEntitlements(
			_ORDER_ITEM_ID
		);
	}

	private CustomField _createCustomField(String name, String data) {
		CustomField customField = new CustomField();

		CustomValue customValue = new CustomValue();

		customValue.setData(data);

		customField.setCustomValue(customValue);

		customField.setName(name);

		return customField;
	}

	private Entitlement _createEntitlement(
		long entitlementDefinitionId, String name) {

		JSONObject jsonObject = _createEntitlementJSONObject(
			entitlementDefinitionId, name);

		jsonObject.put(
			"entitlementDefinitionToEntitlement",
			new JSONObject(
			).put(
				"id", entitlementDefinitionId
			).put(
				"unit", "TiB"
			));

		return new Entitlement(jsonObject);
	}

	private EntitlementDefinition _createEntitlementDefinition(
		Double defaultQuantity, long entitlementDefinitionId, String name) {

		return new EntitlementDefinition(
			new JSONObject(
			).put(
				"active", true
			).put(
				"defaultQuantity", defaultQuantity
			).put(
				"grantType", "fixed"
			).put(
				"id", entitlementDefinitionId
			).put(
				"name", name
			));
	}

	private JSONObject _createEntitlementJSONObject(
		long entitlementDefinitionId, String name) {

		return new JSONObject(
		).put(
			"id", entitlementDefinitionId
		).put(
			"name", name
		).put(
			"r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId",
			entitlementDefinitionId
		);
	}

	private Entitlement _createEntitlementWithContract(
		long contractId, String terminationStatus) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"id", contractId + 1
		).put(
			"r_accountEntryToEntitlement_accountEntryId", _ACCOUNT_ID
		).put(
			"r_contractToEntitlement_c_contractId", contractId
		);

		if (terminationStatus != null) {
			jsonObject.put("terminationStatus", terminationStatus);
		}

		return new Entitlement(jsonObject);
	}

	private Entitlement _createEntitlementWithDates(
		long entitlementId, String startDate, String endDate) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"id", entitlementId
		).put(
			"r_commerceOrderItemToEntitlement_commerceOrderItemId",
			_ORDER_ITEM_ID
		);

		if (startDate != null) {
			jsonObject.put("startDate", startDate);
		}

		if (endDate != null) {
			jsonObject.put("endDate", endDate);
		}

		return new Entitlement(jsonObject);
	}

	private Entitlement _createEntitlementWithOrderItem(
		long commerceOrderItemId) {

		return new Entitlement(
			new JSONObject(
			).put(
				"id", commerceOrderItemId + 1
			).put(
				"r_commerceOrderItemToEntitlement_commerceOrderItemId",
				commerceOrderItemId
			));
	}

	private Entitlement _createEntitlementWithQuantity(
		long entitlementId, Double defaultQuantity, Double quantity) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"id", entitlementId
		).put(
			"quantity", quantity
		).put(
			"r_commerceOrderItemToEntitlement_commerceOrderItemId",
			_ORDER_ITEM_ID
		);

		if (defaultQuantity != null) {
			jsonObject.put(
				"entitlementDefinitionToEntitlement",
				new JSONObject(
				).put(
					"defaultQuantity", defaultQuantity
				).put(
					"id", 1
				));
		}

		return new Entitlement(jsonObject);
	}

	private Entitlement _createEntitlementWithoutDefinition(
		long entitlementDefinitionId, String name) {

		return new Entitlement(
			_createEntitlementJSONObject(entitlementDefinitionId, name));
	}

	private OrderItem _createOrderItem() {
		OrderItem orderItem = new OrderItem();

		orderItem.setId(_ORDER_ITEM_ID);
		orderItem.setOrderId(_ORDER_ID);
		orderItem.setQuantity(BigDecimal.valueOf(2));
		orderItem.setSkuExternalReferenceCode(_SKU_EXTERNAL_REFERENCE_CODE);

		return orderItem;
	}

	private List<Long> _getEntitlementDefinitionIds(
		List<EntitlementDefinition> entitlementDefinitions) {

		List<Long> entitlementDefinitionIds = new ArrayList<>();

		for (EntitlementDefinition entitlementDefinition :
				entitlementDefinitions) {

			entitlementDefinitionIds.add(
				entitlementDefinition.getEntitlementDefinitionId());
		}

		return entitlementDefinitionIds;
	}

	private void _setUpCustomerEntitlements(Entitlement... entitlements)
		throws Exception {

		Mockito.doReturn(
			Arrays.asList(entitlements)
		).when(
			_entitlementService
		).getAllProjectedItems(
			Mockito.anyString(), Mockito.anyString(), Mockito.anyString(),
			Mockito.any()
		);
	}

	private void _setUpEntitlements(Entitlement... entitlements)
		throws Exception {

		Mockito.doReturn(
			Arrays.asList(entitlements)
		).when(
			_entitlementService
		).getEntitlements(
			Mockito.anyString()
		);
	}

	private void _setUpLicenseKeyDurationDaysOrder(
			int licenseKeyDurationDays, String orderTypeExternalReferenceCode)
		throws Exception {

		_setUpOrderItem(_createOrderItem());

		Mockito.when(
			_entitlementDefinitionService.getEntitlementDefinitions(
				Mockito.anyMap(), Mockito.anyString())
		).thenReturn(
			List.of(
				new EntitlementDefinition(
					new JSONObject(
					).put(
						"grantType", "fixed"
					).put(
						"id", 1L
					).put(
						"licenseKeyDurationDays", licenseKeyDurationDays
					).put(
						"name", "cmp-trial"
					)))
		);

		Order order = new Order();

		order.setAccountId(_ACCOUNT_ID);
		order.setId(_ORDER_ID);
		order.setOrderTypeExternalReferenceCode(orderTypeExternalReferenceCode);

		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(_ORDER_ID)
		).thenReturn(
			order
		);

		Mockito.doReturn(
			_createEntitlement(1, "cmp-trial")
		).when(
			_entitlementService
		).addEntitlement(
			Mockito.anyLong(), Mockito.anyLong(), Mockito.anyLong(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	private void _setUpOrderItem(OrderItem orderItem) throws Exception {
		Mockito.when(
			_commerceOrderItemService.fetchCommerceOrderItem(_ORDER_ITEM_ID)
		).thenReturn(
			orderItem
		);
	}

	private void _setUpOtherTrialOrder(
			long orderId, int orderStatus,
			String orderTypeExternalReferenceCode)
		throws Exception {

		Order order = new Order();

		order.setId(orderId);
		order.setOrderStatus(orderStatus);
		order.setOrderTypeExternalReferenceCode(orderTypeExternalReferenceCode);

		Mockito.when(
			_commerceOrderService.getOrders(
				Mockito.contains("'" + orderTypeExternalReferenceCode + "'"))
		).thenReturn(
			List.of(order)
		);
	}

	private void _verifyAddEntitlement(int licenseKeyDurationDays)
		throws Exception {

		Mockito.verify(
			_entitlementService
		).addEntitlement(
			Mockito.eq(_ACCOUNT_ID), Mockito.eq(_ORDER_ITEM_ID),
			Mockito.anyLong(), Mockito.eq(1L), Mockito.any(),
			Mockito.eq("fixed"), Mockito.eq(licenseKeyDurationDays),
			Mockito.any(), Mockito.eq("cmp-trial"), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any()
		);
	}

	private static final long _ACCOUNT_ID = 40001;

	private static final long _CONTRACT_ID = 60001;

	private static final long _ORDER_ID = 9001;

	private static final long _ORDER_ITEM_ID = 7001;

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-001";

	private static final String _SKU_EXTERNAL_REFERENCE_CODE = "SKU-001";

	private final CommerceOrderItemService _commerceOrderItemService =
		Mockito.mock(CommerceOrderItemService.class);
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private final EntitlementDefinitionService _entitlementDefinitionService =
		Mockito.mock(EntitlementDefinitionService.class);
	private EntitlementService _entitlementService;
	private final List<String> _patchBodies = new ArrayList<>();
	private final List<URI> _patchURIs = new ArrayList<>();

}