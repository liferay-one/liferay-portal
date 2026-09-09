/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.service.EntitlementDefinitionService;

import org.json.JSONObject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Veloso
 */
public class ObjectActionCommerceProductDefinitionUpdateRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionCommerceProductDefinitionUpdateRestController =
			new ObjectActionCommerceProductDefinitionUpdateRestController();

		ReflectionTestUtils.setField(
			_objectActionCommerceProductDefinitionUpdateRestController,
			"_entitlementDefinitionService", _entitlementDefinitionService);
	}

	@Test
	public void testPostGeneratesEntitlementDefinitionsForApprovedProduct()
		throws Exception {

		_objectActionCommerceProductDefinitionUpdateRestController.post(
			_createJSON(0));

		Mockito.verify(
			_entitlementDefinitionService
		).generateEntitlementDefinition(
			_C_PRODUCT_ID
		);
	}

	@Test
	public void testPostSkipsProductWithoutModelAttributes() throws Exception {
		JSONObject jsonObject = new JSONObject(
		).put(
			"classPK", 12345L
		);

		_objectActionCommerceProductDefinitionUpdateRestController.post(
			jsonObject.toString());

		Mockito.verifyNoInteractions(_entitlementDefinitionService);
	}

	@Test
	public void testPostSkipsUnapprovedProduct() throws Exception {
		_objectActionCommerceProductDefinitionUpdateRestController.post(
			_createJSON(2));

		Mockito.verifyNoInteractions(_entitlementDefinitionService);
	}

	private String _createJSON(int status) {
		JSONObject jsonObject = new JSONObject(
		).put(
			"modelCPDefinition",
			new JSONObject(
			).put(
				"CProductId", _C_PRODUCT_ID
			).put(
				"status", status
			)
		);

		return jsonObject.toString();
	}

	private static final long _C_PRODUCT_ID = 3000L;

	private final EntitlementDefinitionService _entitlementDefinitionService =
		Mockito.mock(EntitlementDefinitionService.class);
	private ObjectActionCommerceProductDefinitionUpdateRestController
		_objectActionCommerceProductDefinitionUpdateRestController;

}