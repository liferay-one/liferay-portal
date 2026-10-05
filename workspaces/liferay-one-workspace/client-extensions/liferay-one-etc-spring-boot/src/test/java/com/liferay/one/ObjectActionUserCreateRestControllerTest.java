/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.admin.user.client.problem.Problem;
import com.liferay.one.jira.synchronizer.UserAccountSynchronizer;
import com.liferay.one.service.UserAccountService;

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
public class ObjectActionUserCreateRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionUserCreateRestController =
			new ObjectActionUserCreateRestController();

		ReflectionTestUtils.setField(
			_objectActionUserCreateRestController, "_userAccountService",
			_userAccountService);
		ReflectionTestUtils.setField(
			_objectActionUserCreateRestController, "_userAccountSynchronizer",
			_userAccountSynchronizer);
	}

	@Test
	public void testPost() throws Exception {
		UserAccount userAccount = new UserAccount();

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			userAccount
		);

		_objectActionUserCreateRestController.post(_createJSON());

		Mockito.verify(
			_userAccountSynchronizer
		).syncUserAccount(
			userAccount
		);
	}

	@Test
	public void testPostPropagatesUnknownUserAccount() throws Exception {
		Problem problem = new Problem();

		problem.setStatus("NOT_FOUND");

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenThrow(
			new Problem.ProblemException(problem)
		);

		Assertions.assertThrows(
			Problem.ProblemException.class,
			() -> _objectActionUserCreateRestController.post(_createJSON()));

		Mockito.verifyNoInteractions(_userAccountSynchronizer);
	}

	@Test
	public void testPostThrowsWhenPayloadIsMalformed() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionUserCreateRestController.post("{}"));

		Mockito.verifyNoInteractions(
			_userAccountService, _userAccountSynchronizer);
	}

	private String _createJSON() {
		return new JSONObject(
		).put(
			"classPK", _USER_ID
		).toString();
	}

	private static final long _USER_ID = 1000L;

	private ObjectActionUserCreateRestController
		_objectActionUserCreateRestController;
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);
	private final UserAccountSynchronizer _userAccountSynchronizer =
		Mockito.mock(UserAccountSynchronizer.class);

}