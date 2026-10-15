/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.admin.user.client.problem.Problem;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.service.UserGroupService;

import org.json.JSONException;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Franca
 */
public class ObjectActionProjectMembershipUserGroupRemoveRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_objectActionProjectMembershipUserGroupRemoveRestController =
			new ObjectActionProjectMembershipUserGroupRemoveRestController();

		ReflectionTestUtils.setField(
			_objectActionProjectMembershipUserGroupRemoveRestController,
			"_userAccountService", _userAccountService);
		ReflectionTestUtils.setField(
			_objectActionProjectMembershipUserGroupRemoveRestController,
			"_userGroupService", _userGroupService);

		UserAccount userAccount = new UserAccount();

		userAccount.setId(_USER_ID);

		Mockito.when(
			_userAccountService.fetchUserAccountByExternalReferenceCode(
				_USER_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			userAccount
		);
	}

	@Test
	public void testPost() throws Exception {
		_objectActionProjectMembershipUserGroupRemoveRestController.post(
			_createJSON());

		Mockito.verify(
			_userGroupService
		).syncUserAccountUserGroups(
			_USER_ID
		);
	}

	@Test
	public void testPostPropagatesFetchFailure() throws Exception {
		Problem problem = new Problem();

		problem.setStatus("FORBIDDEN");

		Mockito.when(
			_userAccountService.fetchUserAccountByExternalReferenceCode(
				_USER_EXTERNAL_REFERENCE_CODE)
		).thenThrow(
			new Problem.ProblemException(problem)
		);

		Assertions.assertThrows(
			Problem.ProblemException.class,
			() ->
				_objectActionProjectMembershipUserGroupRemoveRestController.
					post(_createJSON()));

		Mockito.verifyNoInteractions(_userGroupService);
	}

	@Test
	public void testPostPropagatesSyncFailure() throws Exception {
		Problem problem = new Problem();

		problem.setStatus("NOT_FOUND");

		Mockito.doThrow(
			new Problem.ProblemException(problem)
		).when(
			_userGroupService
		).syncUserAccountUserGroups(
			_USER_ID
		);

		Assertions.assertThrows(
			Problem.ProblemException.class,
			() ->
				_objectActionProjectMembershipUserGroupRemoveRestController.
					post(_createJSON()));
	}

	@Test
	public void testPostSkipsWhenUserNoLongerExists() throws Exception {
		Mockito.when(
			_userAccountService.fetchUserAccountByExternalReferenceCode(
				_USER_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			null
		);

		_objectActionProjectMembershipUserGroupRemoveRestController.post(
			_createJSON());

		Mockito.verifyNoInteractions(_userGroupService);
	}

	@Test
	public void testPostThrowsWhenObjectEntryIsMissing() {
		Assertions.assertThrows(
			JSONException.class,
			() ->
				_objectActionProjectMembershipUserGroupRemoveRestController.
					post("{}"));

		Mockito.verifyNoInteractions(_userGroupService);
	}

	@Test
	public void testPostThrowsWhenPayloadIsMalformed() {
		Assertions.assertThrows(
			JSONException.class,
			() ->
				_objectActionProjectMembershipUserGroupRemoveRestController.
					post("not json"));

		Mockito.verifyNoInteractions(_userGroupService);
	}

	@Test
	public void testPostThrowsWhenUserExternalReferenceCodeIsMissing() {
		Assertions.assertThrows(
			JSONException.class,
			() ->
				_objectActionProjectMembershipUserGroupRemoveRestController.
					post(
						new JSONObject(
						).put(
							"objectEntry",
							new JSONObject(
							).put(
								"values", new JSONObject()
							)
						).toString()));

		Mockito.verifyNoInteractions(_userGroupService);
	}

	@Test
	public void testPostThrowsWhenValuesAreMissing() {
		Assertions.assertThrows(
			JSONException.class,
			() ->
				_objectActionProjectMembershipUserGroupRemoveRestController.
					post(
						new JSONObject(
						).put(
							"objectEntry", new JSONObject()
						).toString()));

		Mockito.verifyNoInteractions(_userGroupService);
	}

	private String _createJSON() {
		return new JSONObject(
		).put(
			"objectEntry",
			new JSONObject(
			).put(
				"values",
				new JSONObject(
				).put(
					"r_userToProjectMembership_userERC",
					_USER_EXTERNAL_REFERENCE_CODE
				)
			)
		).toString();
	}

	private static final String _USER_EXTERNAL_REFERENCE_CODE = "USER_MEMBER";

	private static final long _USER_ID = 1000L;

	private ObjectActionProjectMembershipUserGroupRemoveRestController
		_objectActionProjectMembershipUserGroupRemoveRestController;
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);
	private final UserGroupService _userGroupService = Mockito.mock(
		UserGroupService.class);

}