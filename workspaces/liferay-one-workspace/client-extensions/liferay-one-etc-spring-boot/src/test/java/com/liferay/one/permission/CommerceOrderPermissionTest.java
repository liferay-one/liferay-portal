/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.permission;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[PERM-COMMERCEORDERPERMISSION] CommerceOrderPermission")
public class CommerceOrderPermissionTest {

	@BeforeEach
	public void setUp() {
		_commerceOrderPermission = new CommerceOrderPermission();

		ReflectionTestUtils.setField(
			_commerceOrderPermission, "_commerceOrderService",
			_commerceOrderService);
		ReflectionTestUtils.setField(
			_commerceOrderPermission, "_userAccountService",
			_userAccountService);
	}

	@Test
	public void testCheckAllowsAdministrator() throws Exception {
		_commerceOrderPermission.check(
			_COMMERCE_ORDER_ID,
			_createUserAccount(RoleConstants.NAME_ADMINISTRATOR));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).fetchCommerceOrder(
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testCheckAllowsLiferayStaff() throws Exception {
		_commerceOrderPermission.check(
			_COMMERCE_ORDER_ID,
			_createUserAccount(RoleConstants.NAME_LIFERAY_STAFF));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).fetchCommerceOrder(
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testCheckAllowsMatchingAccount() throws Exception {
		_whenFetchCommerceOrder(_createOrder(_ACCOUNT_ID));

		_commerceOrderPermission.check(
			_COMMERCE_ORDER_ID, _createUserAccount("User", 99L, _ACCOUNT_ID));
	}

	@Test
	public void testCheckAllowsProvisioningAdministrator() throws Exception {
		_commerceOrderPermission.check(
			_COMMERCE_ORDER_ID,
			_createUserAccount(RoleConstants.NAME_PROVISIONING_ADMINISTRATOR));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).fetchCommerceOrder(
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testCheckDeniesMissingAccount() throws Exception {
		_whenFetchCommerceOrder(new Order());

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _commerceOrderPermission.check(
				_COMMERCE_ORDER_ID, _createUserAccount("User", _ACCOUNT_ID)));
	}

	@Test
	public void testCheckDeniesMissingOrder() throws Exception {
		_whenFetchCommerceOrder(null);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _commerceOrderPermission.check(
				_COMMERCE_ORDER_ID, _createUserAccount("User", _ACCOUNT_ID)));
	}

	@Test
	public void testCheckDeniesOtherAccount() throws Exception {
		_whenFetchCommerceOrder(_createOrder(_ACCOUNT_ID));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _commerceOrderPermission.check(
				_COMMERCE_ORDER_ID, _createUserAccount("User", 99L)));
	}

	@Test
	public void testCheckWithJwtLoadsCurrentUserAccount() throws Exception {
		Jwt jwt = Mockito.mock(Jwt.class);

		Mockito.when(
			_userAccountService.getMyUserAccount(jwt)
		).thenReturn(
			_createUserAccount("User", 99L)
		);

		_whenFetchCommerceOrder(_createOrder(_ACCOUNT_ID));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _commerceOrderPermission.check(_COMMERCE_ORDER_ID, jwt));

		Mockito.verify(
			_userAccountService
		).getMyUserAccount(
			jwt
		);
	}

	private Order _createOrder(long accountId) {
		Order order = new Order();

		Account account = new Account();

		account.setId(accountId);

		order.setAccount(account);

		return order;
	}

	private UserAccount _createUserAccount(
		String roleName, Long... accountIds) {

		UserAccount userAccount = new UserAccount();

		AccountBrief[] accountBriefs = new AccountBrief[accountIds.length];

		for (int i = 0; i < accountIds.length; i++) {
			AccountBrief accountBrief = new AccountBrief();

			accountBrief.setId(accountIds[i]);

			accountBriefs[i] = accountBrief;
		}

		RoleBrief roleBrief = new RoleBrief();

		roleBrief.setName(roleName);

		userAccount.setAccountBriefs(accountBriefs);
		userAccount.setRoleBriefs(new RoleBrief[] {roleBrief});

		return userAccount;
	}

	private void _whenFetchCommerceOrder(Order order) throws Exception {
		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(_COMMERCE_ORDER_ID)
		).thenReturn(
			order
		);
	}

	private static final long _ACCOUNT_ID = 42L;

	private static final long _COMMERCE_ORDER_ID = 1001L;

	private CommerceOrderPermission _commerceOrderPermission;
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);

}