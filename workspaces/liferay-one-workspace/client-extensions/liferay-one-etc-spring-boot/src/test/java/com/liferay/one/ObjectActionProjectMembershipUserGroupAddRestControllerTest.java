/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.problem.Problem;
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
public class ObjectActionProjectMembershipUserGroupAddRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionProjectMembershipUserGroupAddRestController =
			new ObjectActionProjectMembershipUserGroupAddRestController();

		ReflectionTestUtils.setField(
			_objectActionProjectMembershipUserGroupAddRestController,
			"_userGroupService", _userGroupService);
	}

	@Test
	public void testPost() throws Exception {
		_objectActionProjectMembershipUserGroupAddRestController.post(
			_createJSON());

		Mockito.verify(
			_userGroupService
		).syncUserAccountUserGroups(
			_USER_ID
		);
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
			() -> _objectActionProjectMembershipUserGroupAddRestController.post(
				_createJSON()));
	}

	@Test
	public void testPostThrowsWhenObjectEntryIsMissing() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionProjectMembershipUserGroupAddRestController.post(
				"{}"));

		Mockito.verifyNoInteractions(_userGroupService);
	}

	@Test
	public void testPostThrowsWhenPayloadIsMalformed() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionProjectMembershipUserGroupAddRestController.post(
				"not json"));

		Mockito.verifyNoInteractions(_userGroupService);
	}

	@Test
	public void testPostThrowsWhenUserIdIsMissing() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionProjectMembershipUserGroupAddRestController.post(
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
			() -> _objectActionProjectMembershipUserGroupAddRestController.post(
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
					"r_userToProjectMembership_userId", _USER_ID
				)
			)
		).toString();
	}

	private static final long _USER_ID = 1000L;

	private ObjectActionProjectMembershipUserGroupAddRestController
		_objectActionProjectMembershipUserGroupAddRestController;
	private final UserGroupService _userGroupService = Mockito.mock(
		UserGroupService.class);

}