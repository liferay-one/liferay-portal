/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.admin.user.client.resource.v1_0.UserAccountResource;
import com.liferay.one.constants.RoleConstants;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.MockedStatic;
import org.mockito.Mockito;

import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * @author Ryan Schuhler
 */
public class UserAccountServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		UserAccountResource.Builder builder = Mockito.mock(
			UserAccountResource.Builder.class, Mockito.RETURNS_SELF);

		Mockito.when(
			builder.build()
		).thenReturn(
			_userAccountResource
		);

		_userAccountResourceMockedStatic.when(
			UserAccountResource::builder
		).thenReturn(
			builder
		);

		ReflectionTestUtils.setField(
			_userAccountService, "_liferayOAuth2AccessTokenManager",
			Mockito.mock(LiferayOAuth2AccessTokenManager.class));
		ReflectionTestUtils.setField(
			_userAccountService, "lxcDXPMainDomain", "localhost:8080");
	}

	@AfterEach
	public void tearDown() {
		RequestContextHolder.resetRequestAttributes();

		_userAccountResourceMockedStatic.close();
	}

	@Test
	public void testGetMyUserAccountIgnoresOwnUserID() throws Exception {
		_whenMyUserAccount(RoleConstants.NAME_ADMINISTRATOR);
		_setRequest("GET", _USER_ID);

		UserAccount userAccount = _userAccountService.getMyUserAccount(_jwt);

		Assertions.assertEquals(_USER_ID, userAccount.getId());

		Mockito.verify(
			_userAccountResource, Mockito.never()
		).getUserAccount(
			Mockito.anyLong()
		);
	}

	@Test
	public void testGetMyUserAccountRejectsNonadministrator() throws Exception {
		_whenMyUserAccount(RoleConstants.NAME_PROVISIONING_ADMINISTRATOR);
		_setRequest("GET", _DO_AS_USER_ID);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _userAccountService.getMyUserAccount(_jwt));
	}

	@Test
	public void testGetMyUserAccountReturnsImpersonatedUser() throws Exception {
		Mockito.when(
			_userAccountResource.getUserAccount(_DO_AS_USER_ID)
		).thenReturn(
			_createUserAccount(_DO_AS_USER_ID)
		);

		_whenMyUserAccount(RoleConstants.NAME_ADMINISTRATOR);
		_setRequest("GET", _DO_AS_USER_ID);

		UserAccount userAccount = _userAccountService.getMyUserAccount(_jwt);

		Assertions.assertEquals(_DO_AS_USER_ID, userAccount.getId());
		Assertions.assertSame(
			userAccount, _userAccountService.getMyUserAccount(_jwt));

		Mockito.verify(
			_userAccountResource
		).getMyUserAccount();

		Mockito.verify(
			_userAccountResource
		).getUserAccount(
			_DO_AS_USER_ID
		);
	}

	@Test
	public void testGetMyUserAccountReturnsRealUserWithoutDoAsUserID()
		throws Exception {

		_whenMyUserAccount(RoleConstants.NAME_ADMINISTRATOR);

		UserAccount userAccount = _userAccountService.getMyUserAccount(_jwt);

		Assertions.assertEquals(_USER_ID, userAccount.getId());

		_setRequest("GET", null);

		userAccount = _userAccountService.getMyUserAccount(_jwt);

		Assertions.assertEquals(_USER_ID, userAccount.getId());
	}

	private UserAccount _createUserAccount(long id, String... roleNames) {
		UserAccount userAccount = new UserAccount();

		userAccount.setId(id);

		RoleBrief[] roleBriefs = new RoleBrief[roleNames.length];

		for (int i = 0; i < roleNames.length; i++) {
			RoleBrief roleBrief = new RoleBrief();

			roleBrief.setName(roleNames[i]);

			roleBriefs[i] = roleBrief;
		}

		userAccount.setRoleBriefs(roleBriefs);

		return userAccount;
	}

	private void _setRequest(String method, Long doAsUserId) {
		MockHttpServletRequest mockHttpServletRequest =
			new MockHttpServletRequest(method, "/projects");

		if (doAsUserId != null) {
			mockHttpServletRequest.setParameter(
				"doAsUserId", String.valueOf(doAsUserId));
		}

		RequestContextHolder.setRequestAttributes(
			new ServletRequestAttributes(mockHttpServletRequest));
	}

	private void _whenMyUserAccount(String roleName) throws Exception {
		Mockito.when(
			_userAccountResource.getMyUserAccount()
		).thenReturn(
			_createUserAccount(_USER_ID, roleName)
		);
	}

	private static final long _DO_AS_USER_ID = 200L;

	private static final long _USER_ID = 100L;

	private final Jwt _jwt = Mockito.mock(Jwt.class);
	private final UserAccountResource _userAccountResource = Mockito.mock(
		UserAccountResource.class);
	private final MockedStatic<UserAccountResource>
		_userAccountResourceMockedStatic = Mockito.mockStatic(
			UserAccountResource.class);
	private final UserAccountService _userAccountService =
		new UserAccountService();

}