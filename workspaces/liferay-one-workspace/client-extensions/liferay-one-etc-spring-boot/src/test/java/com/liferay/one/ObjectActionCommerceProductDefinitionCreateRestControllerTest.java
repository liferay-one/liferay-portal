/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.service.CommerceProductService;

import org.json.JSONObject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Beatriz Costa
 */
public class ObjectActionCommerceProductDefinitionCreateRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionCommerceProductDefinitionCreateRestController =
			new ObjectActionCommerceProductDefinitionCreateRestController();

		ReflectionTestUtils.setField(
			_objectActionCommerceProductDefinitionCreateRestController,
			"_commerceProductService", _commerceProductService);
	}

	@Test
	public void testPostSendsNotificationForCreatedProduct() throws Exception {
		_objectActionCommerceProductDefinitionCreateRestController.post(
			_createJSON());

		Mockito.verify(
			_commerceProductService
		).sendNewAppSubmittedNotification(
			_C_PRODUCT_ID
		);
	}

	@Test
	public void testPostSkipsProductWithoutModelAttributes() throws Exception {
		JSONObject jsonObject = new JSONObject(
		).put(
			"classPK", 12345L
		);

		_objectActionCommerceProductDefinitionCreateRestController.post(
			jsonObject.toString());

		Mockito.verifyNoInteractions(_commerceProductService);
	}

	private String _createJSON() {
		JSONObject jsonObject = new JSONObject(
		).put(
			"modelCPDefinition",
			new JSONObject(
			).put(
				"CProductId", _C_PRODUCT_ID
			)
		);

		return jsonObject.toString();
	}

	private static final long _C_PRODUCT_ID = 3000L;

	private final CommerceProductService _commerceProductService = Mockito.mock(
		CommerceProductService.class);
	private ObjectActionCommerceProductDefinitionCreateRestController
		_objectActionCommerceProductDefinitionCreateRestController;

}