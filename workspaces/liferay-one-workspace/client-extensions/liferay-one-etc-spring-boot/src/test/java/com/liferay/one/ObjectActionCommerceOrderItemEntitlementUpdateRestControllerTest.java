/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.service.EntitlementService;

import org.json.JSONException;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class ObjectActionCommerceOrderItemEntitlementUpdateRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionCommerceOrderItemEntitlementUpdateRestController =
			new ObjectActionCommerceOrderItemEntitlementUpdateRestController();

		ReflectionTestUtils.setField(
			_objectActionCommerceOrderItemEntitlementUpdateRestController,
			"_entitlementService", _entitlementService);
	}

	@Test
	public void testPostPropagatesEntitlementServiceFailure() throws Exception {
		Mockito.doThrow(
			new IllegalStateException()
		).when(
			_entitlementService
		).updateEntitlements(
			_ORDER_ITEM_ID
		);

		Assertions.assertThrows(
			IllegalStateException.class,
			() ->
				_objectActionCommerceOrderItemEntitlementUpdateRestController.
					post(
						null,
						new JSONObject(
						).put(
							"classPK", _ORDER_ITEM_ID
						).toString()));
	}

	@Test
	public void testPostRejectsPayloadWithoutClassPK() throws Exception {
		Assertions.assertThrows(
			JSONException.class,
			() ->
				_objectActionCommerceOrderItemEntitlementUpdateRestController.
					post(null, "{}"));

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testPostUpdatesEntitlementsForOrderItem() throws Exception {
		_objectActionCommerceOrderItemEntitlementUpdateRestController.post(
			null,
			new JSONObject(
			).put(
				"classPK", _ORDER_ITEM_ID
			).toString());

		Mockito.verify(
			_entitlementService
		).updateEntitlements(
			_ORDER_ITEM_ID
		);
	}

	private static final long _ORDER_ITEM_ID = 3000L;

	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private ObjectActionCommerceOrderItemEntitlementUpdateRestController
		_objectActionCommerceOrderItemEntitlementUpdateRestController;

}