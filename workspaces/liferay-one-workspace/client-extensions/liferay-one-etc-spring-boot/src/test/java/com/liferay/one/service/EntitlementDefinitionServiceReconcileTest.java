/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.portal.kernel.util.ListUtil;
import com.liferay.portal.kernel.workflow.WorkflowConstants;

import java.util.Collections;
import java.util.function.Function;

import org.json.JSONObject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CRON-RECONCILEENTITLEMENTDEFINITIONS] EntitlementDefinitionService#reconcileEntitlementDefinitions"
)
public class EntitlementDefinitionServiceReconcileTest {

	@BeforeEach
	public void setUp() throws Exception {
		_entitlementDefinitionService = Mockito.spy(
			new EntitlementDefinitionService());

		Mockito.doAnswer(
			invocation -> {
				Function<JSONObject, Long> function = invocation.getArgument(2);

				return ListUtil.fromArray(
					function.apply(
						_createProductJSONObject(
							10L, WorkflowConstants.STATUS_APPROVED)),
					function.apply(
						_createProductJSONObject(
							11L, WorkflowConstants.STATUS_DRAFT)),
					function.apply(
						_createProductJSONObject(
							12L, WorkflowConstants.STATUS_APPROVED)));
			}
		).when(
			_entitlementDefinitionService
		).getAllItems(
			ArgumentMatchers.eq(_PRODUCTS_PATH), ArgumentMatchers.isNull(),
			ArgumentMatchers.any()
		);

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			_entitlementDefinitionService
		).getEntitlementDefinitions(
			"active eq true"
		);

		Mockito.doNothing(
		).when(
			_entitlementDefinitionService
		).generateEntitlementDefinition(
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testReconcileEntitlementDefinitionsContinuesAfterProductFailure()
		throws Exception {

		Mockito.doThrow(
			new IllegalStateException("Unable to generate")
		).when(
			_entitlementDefinitionService
		).generateEntitlementDefinition(
			10L
		);

		_entitlementDefinitionService.reconcileEntitlementDefinitions();

		Mockito.verify(
			_entitlementDefinitionService
		).generateEntitlementDefinition(
			12L
		);

		Mockito.verify(
			_entitlementDefinitionService
		).getEntitlementDefinitions(
			"active eq true"
		);
	}

	@Test
	public void testReconcileEntitlementDefinitionsRegeneratesApprovedProducts()
		throws Exception {

		_entitlementDefinitionService.reconcileEntitlementDefinitions();

		Mockito.verify(
			_entitlementDefinitionService
		).generateEntitlementDefinition(
			10L
		);

		Mockito.verify(
			_entitlementDefinitionService, Mockito.never()
		).generateEntitlementDefinition(
			11L
		);

		Mockito.verify(
			_entitlementDefinitionService
		).generateEntitlementDefinition(
			12L
		);
	}

	@Test
	public void testReconcileEntitlementDefinitionsReleasesGuardAfterRun()
		throws Exception {

		_entitlementDefinitionService.reconcileEntitlementDefinitions();
		_entitlementDefinitionService.reconcileEntitlementDefinitions();

		Mockito.verify(
			_entitlementDefinitionService, Mockito.times(2)
		).generateEntitlementDefinition(
			10L
		);
	}

	@Test
	public void testReconcileEntitlementDefinitionsSkipsRunInFlight()
		throws Exception {

		Mockito.doAnswer(
			invocation -> {
				_entitlementDefinitionService.reconcileEntitlementDefinitions();

				return null;
			}
		).when(
			_entitlementDefinitionService
		).generateEntitlementDefinition(
			10L
		);

		_entitlementDefinitionService.reconcileEntitlementDefinitions();

		Mockito.verify(
			_entitlementDefinitionService, Mockito.times(1)
		).getAllItems(
			ArgumentMatchers.eq(_PRODUCTS_PATH), ArgumentMatchers.isNull(),
			ArgumentMatchers.any()
		);

		Mockito.verify(
			_entitlementDefinitionService, Mockito.times(1)
		).generateEntitlementDefinition(
			12L
		);
	}

	private JSONObject _createProductJSONObject(
		long productId, int productStatus) {

		return new JSONObject(
		).put(
			"productId", productId
		).put(
			"productStatus", productStatus
		);
	}

	private static final String _PRODUCTS_PATH =
		"/o/headless-commerce-admin-catalog/v1.0/products";

	private EntitlementDefinitionService _entitlementDefinitionService;

}