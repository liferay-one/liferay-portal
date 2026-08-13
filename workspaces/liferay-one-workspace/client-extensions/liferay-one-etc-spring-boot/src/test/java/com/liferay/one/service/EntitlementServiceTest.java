/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

/**
 * @author Felipe Veloso
 */
public class EntitlementServiceTest {

	@BeforeEach
	public void setUp() {
		_entitlementService = Mockito.spy(new EntitlementService());
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
				_entitlementService.getActiveEntitlementDefinitions(
					_ACCOUNT_ID)));
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
				_entitlementService.getActiveEntitlementDefinitions(
					_ACCOUNT_ID)));
	}

	@Test
	public void testGetActiveEntitlementDefinitionsReadsNestedDefinition()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, "storage"));

		List<EntitlementDefinition> entitlementDefinitions =
			_entitlementService.getActiveEntitlementDefinitions(_ACCOUNT_ID);

		Assertions.assertEquals(1, entitlementDefinitions.size());

		EntitlementDefinition entitlementDefinition =
			entitlementDefinitions.get(0);

		Assertions.assertEquals(
			1, entitlementDefinition.getEntitlementDefinitionId());
		Assertions.assertEquals(
			_CPRODUCT_ID, entitlementDefinition.getCProductId());
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
				_entitlementService.getActiveEntitlementDefinitions(
					_ACCOUNT_ID)));
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
			Mockito.isNull(), Mockito.anyString()
		);

		_entitlementService.getEntitlements("name eq 'sites'");

		Mockito.verify(
			_entitlementService
		).getAllItems(
			Mockito.eq("/o/c/entitlements"), Mockito.eq("name eq 'sites'"),
			Mockito.any(), Mockito.isNull(),
			Mockito.eq("entitlementDefinitionToEntitlement")
		);
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
				"r_commerceProductToEntitlementDefinition_CProductId",
				_CPRODUCT_ID
			).put(
				"unit", "TiB"
			));

		return new Entitlement(jsonObject);
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

	private Entitlement _createEntitlementWithoutDefinition(
		long entitlementDefinitionId, String name) {

		return new Entitlement(
			_createEntitlementJSONObject(entitlementDefinitionId, name));
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

	private static final long _ACCOUNT_ID = 40001;

	private static final long _CPRODUCT_ID = 55501;

	private EntitlementService _entitlementService;

}