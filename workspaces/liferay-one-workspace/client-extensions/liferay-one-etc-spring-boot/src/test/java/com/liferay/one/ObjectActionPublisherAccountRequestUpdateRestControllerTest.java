/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.service.PublisherAccountRequestService;

import org.json.JSONObject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Beatriz Costa
 */
public class ObjectActionPublisherAccountRequestUpdateRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionPublisherAccountRequestUpdateRestController =
			new ObjectActionPublisherAccountRequestUpdateRestController();

		ReflectionTestUtils.setField(
			_objectActionPublisherAccountRequestUpdateRestController,
			"_publisherAccountRequestService", _publisherAccountRequestService);
	}

	@Test
	public void testPostSendsNotificationWhenCompleted() throws Exception {
		JSONObject modelJSONObject = new JSONObject(
		).put(
			"emailAddress", "publisher@example.com"
		).put(
			"requestStatus",
			new JSONObject(
			).put(
				"key", "completed"
			)
		);

		JSONObject payloadJSONObject = new JSONObject(
		).put(
			"modelPublisherAccountRequest", modelJSONObject
		);

		_objectActionPublisherAccountRequestUpdateRestController.post(
			payloadJSONObject.toString());

		Mockito.verify(
			_publisherAccountRequestService
		).sendCongratulationsPublisherNotification(
			Mockito.any(JSONObject.class)
		);
	}

	@Test
	public void testPostSkipsWhenModelMissing() throws Exception {
		JSONObject payloadJSONObject = new JSONObject(
		).put(
			"classPK", 12345L
		);

		_objectActionPublisherAccountRequestUpdateRestController.post(
			payloadJSONObject.toString());

		Mockito.verifyNoInteractions(_publisherAccountRequestService);
	}

	@Test
	public void testPostSkipsWhenNotCompleted() throws Exception {
		JSONObject modelJSONObject = new JSONObject(
		).put(
			"emailAddress", "publisher@example.com"
		).put(
			"requestStatus",
			new JSONObject(
			).put(
				"key", "open"
			)
		);

		JSONObject payloadJSONObject = new JSONObject(
		).put(
			"modelPublisherAccountRequest", modelJSONObject
		);

		_objectActionPublisherAccountRequestUpdateRestController.post(
			payloadJSONObject.toString());

		Mockito.verifyNoInteractions(_publisherAccountRequestService);
	}

	private ObjectActionPublisherAccountRequestUpdateRestController
		_objectActionPublisherAccountRequestUpdateRestController;
	private final PublisherAccountRequestService
		_publisherAccountRequestService = Mockito.mock(
			PublisherAccountRequestService.class);

}