/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.pubsub.subscriber;

import com.google.api.gax.core.CredentialsProvider;
import com.google.api.gax.core.NoCredentialsProvider;
import com.google.cloud.pubsub.v1.SubscriptionAdminClient;
import com.google.cloud.pubsub.v1.SubscriptionAdminSettings;
import com.google.pubsub.v1.ProjectSubscriptionName;
import com.google.pubsub.v1.Subscription;

import com.liferay.one.pubsub.Message;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.util.HashMap;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CLS-BASEDEADLETTERPUBSUBSUBSCRIBER] BaseDeadLetterPubsubSubscriber"
)
public class BaseDeadLetterPubsubSubscriberTest {

	@Test
	public void testGetSourceTopicCachesTopicPerSubscription()
		throws Exception {

		SubscriptionAdminClient subscriptionAdminClient = Mockito.mock(
			SubscriptionAdminClient.class);

		Mockito.when(
			subscriptionAdminClient.getSubscription(
				ArgumentMatchers.any(ProjectSubscriptionName.class))
		).thenAnswer(
			invocation -> {
				ProjectSubscriptionName projectSubscriptionName =
					invocation.getArgument(0);

				return Subscription.newBuilder(
				).setTopic(
					"projects/project/topics/topic-" +
						projectSubscriptionName.getSubscription()
				).build();
			}
		);

		try (MockedStatic<SubscriptionAdminClient>
				subscriptionAdminClientMockedStatic = Mockito.mockStatic(
					SubscriptionAdminClient.class)) {

			subscriptionAdminClientMockedStatic.when(
				() -> SubscriptionAdminClient.create(
					ArgumentMatchers.any(SubscriptionAdminSettings.class))
			).thenReturn(
				subscriptionAdminClient
			);

			TestDeadLetterPubsubSubscriber testDeadLetterPubsubSubscriber =
				new TestDeadLetterPubsubSubscriber();

			Assertions.assertEquals(
				"topic-a", testDeadLetterPubsubSubscriber.getSourceTopic("a"));
			Assertions.assertEquals(
				"topic-a", testDeadLetterPubsubSubscriber.getSourceTopic("a"));
			Assertions.assertEquals(
				"topic-b", testDeadLetterPubsubSubscriber.getSourceTopic("b"));

			Mockito.verify(
				subscriptionAdminClient
			).getSubscription(
				ProjectSubscriptionName.of("project", "a")
			);

			Mockito.verify(
				subscriptionAdminClient, Mockito.times(2)
			).getSubscription(
				ArgumentMatchers.any(ProjectSubscriptionName.class)
			);
		}
	}

	@Test
	public void testReceiveFallsBackToZeroWithoutDeliveryCount()
		throws Exception {

		TestDeadLetterPubsubSubscriber testDeadLetterPubsubSubscriber =
			new TestDeadLetterPubsubSubscriber();

		Message message = new Message(new HashMap<>(), "payload", "topic");

		testDeadLetterPubsubSubscriber.receive(message);

		Assertions.assertEquals(
			0, testDeadLetterPubsubSubscriber.deliveryAttempt);
		Assertions.assertSame(message, testDeadLetterPubsubSubscriber.message);
		Assertions.assertNull(
			testDeadLetterPubsubSubscriber.sourceSubscriptionName);
	}

	@Test
	public void testReceiveRoutesDeadLetterAttributesToOnDeadLetter()
		throws Exception {

		TestDeadLetterPubsubSubscriber testDeadLetterPubsubSubscriber =
			new TestDeadLetterPubsubSubscriber();

		Message message = new Message(
			HashMapBuilder.put(
				BaseDeadLetterPubsubSubscriber.
					SOURCE_DELIVERY_COUNT_ATTRIBUTE_NAME,
				"5"
			).put(
				BaseDeadLetterPubsubSubscriber.
					SOURCE_SUBSCRIPTION_ATTRIBUTE_NAME,
				"orders-subscription"
			).build(),
			"payload", "topic");

		testDeadLetterPubsubSubscriber.receive(message);

		Assertions.assertEquals(
			5, testDeadLetterPubsubSubscriber.deliveryAttempt);
		Assertions.assertSame(message, testDeadLetterPubsubSubscriber.message);
		Assertions.assertEquals(
			"orders-subscription",
			testDeadLetterPubsubSubscriber.sourceSubscriptionName);
	}

	private static class TestDeadLetterPubsubSubscriber
		extends BaseDeadLetterPubsubSubscriber {

		public int deliveryAttempt = -1;
		public Message message;
		public String sourceSubscriptionName;

		@Override
		protected CredentialsProvider getCredentialsProvider() {
			return NoCredentialsProvider.create();
		}

		@Override
		protected String getProjectId() {
			return "project";
		}

		@Override
		protected void onDeadLetter(
			int deliveryAttempt, Message message,
			String sourceSubscriptionName) {

			this.deliveryAttempt = deliveryAttempt;
			this.message = message;
			this.sourceSubscriptionName = sourceSubscriptionName;
		}

	}

}