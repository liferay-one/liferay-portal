/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.permission.CommerceOrderPermission;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class CommerceOrdersRestControllerTest {

	@BeforeEach
	public void setUp() {
		_commerceOrdersRestController = new CommerceOrdersRestController();

		ReflectionTestUtils.setField(
			_commerceOrdersRestController, "_commerceOrderPermission",
			_commerceOrderPermission);
		ReflectionTestUtils.setField(
			_commerceOrdersRestController, "_commerceOrderService",
			_commerceOrderService);
	}

	@Test
	public void testPostCalculateTax() throws Exception {
		_commerceOrdersRestController.postCalculateTax(_jwt, _ORDER_ID);

		InOrder inOrder = Mockito.inOrder(
			_commerceOrderPermission, _commerceOrderService);

		inOrder.verify(
			_commerceOrderPermission
		).check(
			_ORDER_ID, _jwt
		);

		inOrder.verify(
			_commerceOrderService
		).calculateTax(
			_ORDER_ID
		);
	}

	@Test
	public void testPostCalculateTaxPropagatesUnknownOrder() throws Exception {
		Exception exception = new IllegalArgumentException(
			"No order exists with ID " + _ORDER_ID);

		Mockito.doThrow(
			exception
		).when(
			_commerceOrderService
		).calculateTax(
			_ORDER_ID
		);

		Assertions.assertSame(
			exception,
			Assertions.assertThrows(
				IllegalArgumentException.class,
				() -> _commerceOrdersRestController.postCalculateTax(
					_jwt, _ORDER_ID)));
	}

	@Test
	public void testPostCalculateTaxThrowsForbiddenWithoutPermission()
		throws Exception {

		_mockPermissionDenied();

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _commerceOrdersRestController.postCalculateTax(
				_jwt, _ORDER_ID));

		Mockito.verifyNoInteractions(_commerceOrderService);
	}

	@Test
	public void testPostCompleteCloudApp() throws Exception {
		_commerceOrdersRestController.postCompleteCloudApp(_jwt, _ORDER_ID);

		InOrder inOrder = Mockito.inOrder(
			_commerceOrderPermission, _commerceOrderService);

		inOrder.verify(
			_commerceOrderPermission
		).check(
			_ORDER_ID, _jwt
		);

		inOrder.verify(
			_commerceOrderService
		).completeSettledOrder(
			_ORDER_ID
		);
	}

	@Test
	public void testPostCompleteCloudAppThrowsForbiddenWithoutPermission()
		throws Exception {

		_mockPermissionDenied();

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _commerceOrdersRestController.postCompleteCloudApp(
				_jwt, _ORDER_ID));

		Mockito.verifyNoInteractions(_commerceOrderService);
	}

	@Test
	public void testPostCompleteSettled() throws Exception {
		_commerceOrdersRestController.postCompleteSettled(_jwt, _ORDER_ID);

		InOrder inOrder = Mockito.inOrder(
			_commerceOrderPermission, _commerceOrderService);

		inOrder.verify(
			_commerceOrderPermission
		).check(
			_ORDER_ID, _jwt
		);

		inOrder.verify(
			_commerceOrderService
		).completeSettledOrder(
			_ORDER_ID
		);
	}

	@Test
	public void testPostCompleteSettledDelegatesEveryRerun() throws Exception {
		_commerceOrdersRestController.postCompleteSettled(_jwt, _ORDER_ID);
		_commerceOrdersRestController.postCompleteSettled(_jwt, _ORDER_ID);

		Mockito.verify(
			_commerceOrderService, Mockito.times(2)
		).completeSettledOrder(
			_ORDER_ID
		);
	}

	@Test
	public void testPostCompleteSettledThrowsForbiddenWithoutPermission()
		throws Exception {

		_mockPermissionDenied();

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _commerceOrdersRestController.postCompleteSettled(
				_jwt, _ORDER_ID));

		Mockito.verifyNoInteractions(_commerceOrderService);
	}

	private void _mockPermissionDenied() throws Exception {
		Mockito.doThrow(
			new PrincipalException()
		).when(
			_commerceOrderPermission
		).check(
			_ORDER_ID, _jwt
		);
	}

	private static final long _ORDER_ID = 1000L;

	private final CommerceOrderPermission _commerceOrderPermission =
		Mockito.mock(CommerceOrderPermission.class);
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private CommerceOrdersRestController _commerceOrdersRestController;
	private final Jwt _jwt = Mockito.mock(Jwt.class);

}