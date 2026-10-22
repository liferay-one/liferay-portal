/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import org.json.JSONObject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Beatriz Costa
 */
public class PublisherAccountRequestServiceTest {

	@BeforeEach
	public void setUp() {
		_publisherAccountRequestService = new PublisherAccountRequestService();

		ReflectionTestUtils.setField(
			_publisherAccountRequestService, "_notificationQueueEntryService",
			_notificationQueueEntryService);
		ReflectionTestUtils.setField(
			_publisherAccountRequestService, "_notificationTemplateService",
			_notificationTemplateService);
	}

	@Test
	public void testSendCongratulationsPublisherNotification()
		throws Exception {

		JSONObject modelJSONObject = new JSONObject(
		).put(
			"emailAddress", "publisher@example.com"
		).put(
			"firstName", "John"
		).put(
			"lastName", "Doe"
		);

		JSONObject processedJSONObject = new JSONObject(
		).put(
			"body", "Congratulations Body"
		).put(
			"from", "do-not-reply@liferay.com"
		).put(
			"fromName", "One Liferay"
		).put(
			"subject", "Congratulations Subject"
		);

		Mockito.doReturn(
			processedJSONObject
		).when(
			_notificationTemplateService
		).getAndProcessTemplateJSONObject(
			Mockito.eq("MARKETPLACE-CONGRATULATIONS-TO-BE-A-PUBLISHER"),
			Mockito.eq("en_US"), Mockito.anyMap()
		);

		_publisherAccountRequestService.
			sendCongratulationsPublisherNotification(modelJSONObject);

		Mockito.verify(
			_notificationQueueEntryService
		).addNotificationQueueEntry(
			"do-not-reply@liferay.com", "One Liferay", "publisher@example.com",
			"Congratulations Subject", "Congratulations Body"
		);
	}

	@Test
	public void testSendCongratulationsPublisherNotificationMissingEmail()
		throws Exception {

		_publisherAccountRequestService.
			sendCongratulationsPublisherNotification(new JSONObject());

		Mockito.verifyNoInteractions(_notificationQueueEntryService);
	}

	@Test
	public void testSendNewPublisherRequestNotification() throws Exception {
		JSONObject modelJSONObject = new JSONObject(
		).put(
			"emailAddress", "applicant@example.com"
		).put(
			"firstName", "Jane"
		).put(
			"lastName", "Smith"
		);

		JSONObject processedJSONObject = new JSONObject(
		).put(
			"body", "Request Received Body"
		).put(
			"from", "do-not-reply@liferay.com"
		).put(
			"fromName", "One Liferay"
		).put(
			"subject", "Request Received Subject"
		);

		Mockito.doReturn(
			processedJSONObject
		).when(
			_notificationTemplateService
		).getAndProcessTemplateJSONObject(
			Mockito.eq("MARKETPLACE-NEW-PUBLISHER-REQUEST-PUBLISHER"),
			Mockito.eq("en_US"), Mockito.anyMap()
		);

		_publisherAccountRequestService.sendNewPublisherRequestNotification(
			modelJSONObject);

		Mockito.verify(
			_notificationQueueEntryService
		).addNotificationQueueEntry(
			"do-not-reply@liferay.com", "One Liferay", "applicant@example.com",
			"Request Received Subject", "Request Received Body"
		);
	}

	@Test
	public void testSendNewPublisherRequestNotificationMissingEmail()
		throws Exception {

		_publisherAccountRequestService.sendNewPublisherRequestNotification(
			new JSONObject());

		Mockito.verifyNoInteractions(_notificationQueueEntryService);
	}

	private final NotificationQueueEntryService _notificationQueueEntryService =
		Mockito.mock(NotificationQueueEntryService.class);
	private final NotificationTemplateService _notificationTemplateService =
		Mockito.mock(NotificationTemplateService.class);
	private PublisherAccountRequestService _publisherAccountRequestService;

}