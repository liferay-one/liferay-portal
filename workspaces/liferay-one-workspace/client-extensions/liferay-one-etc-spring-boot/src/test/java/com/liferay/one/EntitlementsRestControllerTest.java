/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.permission.AdminPermission;
import com.liferay.one.service.EntitlementService;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class EntitlementsRestControllerTest {

	@BeforeEach
	public void setUp() {
		_entitlementsRestController = new EntitlementsRestController();

		ReflectionTestUtils.setField(
			_entitlementsRestController, "_adminPermission", _adminPermission);
		ReflectionTestUtils.setField(
			_entitlementsRestController, "_entitlementService",
			_entitlementService);
	}

	@Test
	public void testPostEntitlementsGenerate() throws Exception {
		_entitlementsRestController.postEntitlementsGenerate(
			_jwt, _ORDER_ITEM_ID);

		Mockito.verify(
			_entitlementService
		).generateEntitlements(
			_ORDER_ITEM_ID
		);
	}

	@Test
	public void testPostEntitlementsGeneratePropagatesUnknownOrderItem()
		throws Exception {

		Exception exception = new IllegalArgumentException(
			"No order item exists with ID " + _ORDER_ITEM_ID);

		Mockito.doThrow(
			exception
		).when(
			_entitlementService
		).generateEntitlements(
			_ORDER_ITEM_ID
		);

		Assertions.assertSame(
			exception,
			Assertions.assertThrows(
				IllegalArgumentException.class,
				() -> _entitlementsRestController.postEntitlementsGenerate(
					_jwt, _ORDER_ITEM_ID)));
	}

	@Test
	public void testPostEntitlementsGenerateRequiresAnAdministrator()
		throws Exception {

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_adminPermission
		).check(
			_jwt
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _entitlementsRestController.postEntitlementsGenerate(
				_jwt, _ORDER_ITEM_ID));

		Mockito.verifyNoInteractions(_entitlementService);
	}

	private static final long _ORDER_ITEM_ID = 3000L;

	private final AdminPermission _adminPermission = Mockito.mock(
		AdminPermission.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private EntitlementsRestController _entitlementsRestController;
	private final Jwt _jwt = Mockito.mock(Jwt.class);

}