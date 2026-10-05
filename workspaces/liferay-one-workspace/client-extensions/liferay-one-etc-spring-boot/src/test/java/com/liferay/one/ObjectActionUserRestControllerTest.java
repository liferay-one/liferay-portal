/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.jira.synchronizer.UserAccountSynchronizer;
import com.liferay.one.service.SubscriptionEntryService;

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
public class ObjectActionUserRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionUserRestController = new ObjectActionUserRestController();

		ReflectionTestUtils.setField(
			_objectActionUserRestController, "_subscriptionEntryService",
			_subscriptionEntryService);
		ReflectionTestUtils.setField(
			_objectActionUserRestController, "_userAccountSynchronizer",
			_userAccountSynchronizer);
	}

	@Test
	public void testPost() throws Exception {
		_objectActionUserRestController.post(
			new JSONObject(
			).put(
				"classPK", _USER_ID
			).put(
				"modelUser",
				new JSONObject(
				).put(
					"externalReferenceCode", _EXTERNAL_REFERENCE_CODE
				)
			).toString());

		InOrder inOrder = Mockito.inOrder(
			_subscriptionEntryService, _userAccountSynchronizer);

		inOrder.verify(
			_subscriptionEntryService
		).deleteSubscriptionEntries(
			_USER_ID
		);

		inOrder.verify(
			_userAccountSynchronizer
		).deleteUserAccount(
			_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testPostThrowsWhenClassPKIsMissing() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionUserRestController.post(
				new JSONObject(
				).put(
					"modelUser",
					new JSONObject(
					).put(
						"externalReferenceCode", _EXTERNAL_REFERENCE_CODE
					)
				).toString()));

		Mockito.verifyNoInteractions(
			_subscriptionEntryService, _userAccountSynchronizer);
	}

	@Test
	public void testPostThrowsWhenModelUserIsMissing() throws Exception {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionUserRestController.post(
				new JSONObject(
				).put(
					"classPK", _USER_ID
				).toString()));

		Mockito.verifyNoInteractions(_userAccountSynchronizer);
	}

	@Test
	public void testPostThrowsWhenPayloadIsMalformed() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionUserRestController.post("not json"));

		Mockito.verifyNoInteractions(
			_subscriptionEntryService, _userAccountSynchronizer);
	}

	private static final String _EXTERNAL_REFERENCE_CODE = "USER-001";

	private static final long _USER_ID = 1000L;

	private ObjectActionUserRestController _objectActionUserRestController;
	private final SubscriptionEntryService _subscriptionEntryService =
		Mockito.mock(SubscriptionEntryService.class);
	private final UserAccountSynchronizer _userAccountSynchronizer =
		Mockito.mock(UserAccountSynchronizer.class);

}