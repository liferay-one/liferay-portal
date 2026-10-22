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
public class ObjectActionPublisherAccountRequestCreateRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionPublisherAccountRequestCreateRestController =
			new ObjectActionPublisherAccountRequestCreateRestController();

		ReflectionTestUtils.setField(
			_objectActionPublisherAccountRequestCreateRestController,
			"_publisherAccountRequestService", _publisherAccountRequestService);
	}

	@Test
	public void testPostSendsNotification() throws Exception {
		JSONObject modelJSONObject = new JSONObject(
		).put(
			"emailAddress", "applicant@example.com"
		);

		JSONObject payloadJSONObject = new JSONObject(
		).put(
			"modelPublisherAccountRequest", modelJSONObject
		);

		_objectActionPublisherAccountRequestCreateRestController.post(
			payloadJSONObject.toString());

		Mockito.verify(
			_publisherAccountRequestService
		).sendNewPublisherRequestNotification(
			Mockito.any(JSONObject.class)
		);
	}

	@Test
	public void testPostSkipsWhenModelMissing() throws Exception {
		JSONObject payloadJSONObject = new JSONObject(
		).put(
			"classPK", 12345L
		);

		_objectActionPublisherAccountRequestCreateRestController.post(
			payloadJSONObject.toString());

		Mockito.verifyNoInteractions(_publisherAccountRequestService);
	}

	private ObjectActionPublisherAccountRequestCreateRestController
		_objectActionPublisherAccountRequestCreateRestController;
	private final PublisherAccountRequestService
		_publisherAccountRequestService = Mockito.mock(
			PublisherAccountRequestService.class);

}