/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.EntitlementService;

import org.json.JSONException;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class ObjectActionCommerceOrderUpdateRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionCommerceOrderUpdateRestController =
			new ObjectActionCommerceOrderUpdateRestController();

		ReflectionTestUtils.setField(
			_objectActionCommerceOrderUpdateRestController,
			"_commerceOrderService", _commerceOrderService);
		ReflectionTestUtils.setField(
			_objectActionCommerceOrderUpdateRestController,
			"_entitlementService", _entitlementService);
	}

	@Test
	public void testPost() throws Exception {
		_objectActionCommerceOrderUpdateRestController.post(
			new JSONObject(
			).put(
				"classPK", _ORDER_ID
			).toString());

		InOrder inOrder = Mockito.inOrder(
			_entitlementService, _commerceOrderService);

		inOrder.verify(
			_entitlementService
		).generateOrderEntitlements(
			_ORDER_ID
		);

		inOrder.verify(
			_commerceOrderService
		).dispatchOrderUpdate(
			_ORDER_ID
		);
	}

	@Test
	public void testPostDispatchesWhenEntitlementGenerationFails()
		throws Exception {

		Mockito.doThrow(
			new IllegalStateException()
		).when(
			_entitlementService
		).generateOrderEntitlements(
			_ORDER_ID
		);

		_objectActionCommerceOrderUpdateRestController.post(
			new JSONObject(
			).put(
				"classPK", _ORDER_ID
			).toString());

		Mockito.verify(
			_commerceOrderService
		).dispatchOrderUpdate(
			_ORDER_ID
		);
	}

	@Test
	public void testPostPropagatesDispatchFailure() throws Exception {
		Exception exception = new IllegalStateException();

		Mockito.doThrow(
			exception
		).when(
			_commerceOrderService
		).dispatchOrderUpdate(
			_ORDER_ID
		);

		Assertions.assertSame(
			exception,
			Assertions.assertThrows(
				IllegalStateException.class,
				() -> _objectActionCommerceOrderUpdateRestController.post(
					new JSONObject(
					).put(
						"classPK", _ORDER_ID
					).toString())));
	}

	@Test
	public void testPostThrowsWhenPayloadIsMalformed() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionCommerceOrderUpdateRestController.post("{}"));

		Mockito.verifyNoInteractions(_commerceOrderService);
		Mockito.verifyNoInteractions(_entitlementService);
	}

	private static final long _ORDER_ID = 2000L;

	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private ObjectActionCommerceOrderUpdateRestController
		_objectActionCommerceOrderUpdateRestController;

}