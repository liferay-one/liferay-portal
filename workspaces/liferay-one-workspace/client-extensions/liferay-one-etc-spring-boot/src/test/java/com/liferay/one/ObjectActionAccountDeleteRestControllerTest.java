/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.jira.synchronizer.AccountSynchronizer;

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
public class ObjectActionAccountDeleteRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionAccountDeleteRestController =
			new ObjectActionAccountDeleteRestController();

		ReflectionTestUtils.setField(
			_objectActionAccountDeleteRestController, "_accountSynchronizer",
			_accountSynchronizer);
	}

	@Test
	public void testPost() throws Exception {
		_objectActionAccountDeleteRestController.post(
			new JSONObject(
			).put(
				"classPK", 1000L
			).put(
				"modelAccountEntry",
				new JSONObject(
				).put(
					"externalReferenceCode", _EXTERNAL_REFERENCE_CODE
				)
			).toString());

		Mockito.verify(
			_accountSynchronizer
		).deleteAccount(
			_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testPostThrowsWhenExternalReferenceCodeIsMissing() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionAccountDeleteRestController.post(
				new JSONObject(
				).put(
					"modelAccountEntry", new JSONObject()
				).toString()));

		Mockito.verifyNoInteractions(_accountSynchronizer);
	}

	@Test
	public void testPostThrowsWhenModelAccountEntryIsMissing() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionAccountDeleteRestController.post("{}"));

		Mockito.verifyNoInteractions(_accountSynchronizer);
	}

	@Test
	public void testPostThrowsWhenPayloadIsMalformed() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionAccountDeleteRestController.post("not json"));

		Mockito.verifyNoInteractions(_accountSynchronizer);
	}

	private static final String _EXTERNAL_REFERENCE_CODE = "ACCNT-001";

	private final AccountSynchronizer _accountSynchronizer = Mockito.mock(
		AccountSynchronizer.class);
	private ObjectActionAccountDeleteRestController
		_objectActionAccountDeleteRestController;

}