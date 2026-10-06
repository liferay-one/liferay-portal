/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.okta.pubsub;

import com.liferay.one.pubsub.Message;
import com.liferay.one.pubsub.subscriber.BaseDeadLetterPubsubSubscriber;
import com.liferay.one.service.NotificationQueueEntryService;

import java.util.Map;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
@DisplayName(
	"[SUB-OKTADEADLETTERPUBSUBSUBSCRIBER] OktaDeadLetterPubsubSubscriber"
)
public class OktaDeadLetterPubsubSubscriberTest {

	@BeforeEach
	public void setUp() {
		_subscriber = new OktaDeadLetterPubsubSubscriber();

		_notificationQueueEntryService = Mockito.mock(
			NotificationQueueEntryService.class);

		ReflectionTestUtils.setField(
			_subscriber, "_emailAddressGlobal", "global@example.com");
		ReflectionTestUtils.setField(
			_subscriber, "_notificationQueueEntryService",
			_notificationQueueEntryService);
		ReflectionTestUtils.setField(
			_subscriber, "_notificationRecipient", "oncall@example.com");
		ReflectionTestUtils.setField(_subscriber, "_projectId", "test-project");
		ReflectionTestUtils.setField(
			_subscriber, "_subscription", "test-subscription");
	}

	@Test
	public void testGetProjectIdReturnsConfiguredProjectId() {
		Assertions.assertEquals("test-project", _subscriber.getProjectId());
	}

	@Test
	public void testGetSubscriptionNameReturnsConfiguredSubscription() {
		Assertions.assertEquals(
			"test-subscription", _subscriber.getSubscriptionName());
	}

	@Test
	public void testGetTopicReturnsDeadLetterTopic() {
		Assertions.assertEquals(
			"one-liferay-dead-letter", _subscriber.getTopic());
	}

	@Test
	public void testIsAutoCreateSubscriptionReturnsTrue() {
		Assertions.assertTrue(_subscriber.isAutoCreateSubscription());
	}

	@Test
	public void testReceiveSendsNotificationEmailWithSourceSubscription()
		throws Exception {

		_subscriber.receive(
			new Message(
				Map.of(
					BaseDeadLetterPubsubSubscriber.
						SOURCE_DELIVERY_COUNT_ATTRIBUTE_NAME,
					"5",
					BaseDeadLetterPubsubSubscriber.
						SOURCE_SUBSCRIPTION_ATTRIBUTE_NAME,
					_SOURCE_SUBSCRIPTION),
				"{\"action\":\"ACTIVATE\"}", "one-liferay-dead-letter"));

		ArgumentCaptor<String> bodyArgumentCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.verify(
			_notificationQueueEntryService
		).addNotificationQueueEntry(
			Mockito.eq("global@example.com"), Mockito.eq("Liferay One"),
			Mockito.eq("oncall@example.com"),
			Mockito.eq("Liferay One Dead Letter Notification"),
			bodyArgumentCaptor.capture()
		);

		String body = bodyArgumentCaptor.getValue();

		Assertions.assertTrue(body.contains("5 delivery attempts"));
		Assertions.assertTrue(body.contains(_SOURCE_SUBSCRIPTION));
	}

	private static final String _SOURCE_SUBSCRIPTION =
		"projects/test-project/subscriptions/okta-users";

	private NotificationQueueEntryService _notificationQueueEntryService;
	private OktaDeadLetterPubsubSubscriber _subscriber;

}