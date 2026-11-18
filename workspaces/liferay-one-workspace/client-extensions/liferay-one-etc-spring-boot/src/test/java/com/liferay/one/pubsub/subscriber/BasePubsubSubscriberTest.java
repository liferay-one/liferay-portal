/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.pubsub.subscriber;

import com.google.api.gax.core.CredentialsProvider;
import com.google.api.gax.core.NoCredentialsProvider;
import com.google.api.gax.rpc.NotFoundException;
import com.google.api.gax.rpc.StatusCode;
import com.google.cloud.pubsub.v1.SubscriptionAdminClient;
import com.google.cloud.pubsub.v1.SubscriptionAdminSettings;
import com.google.pubsub.v1.ProjectSubscriptionName;
import com.google.pubsub.v1.RetryPolicy;
import com.google.pubsub.v1.Subscription;

import com.liferay.one.pubsub.Message;
import com.liferay.petra.string.StringPool;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Franca
 */
@DisplayName("[CLS-BASEPUBSUBSUBSCRIBER] BasePubsubSubscriber")
public class BasePubsubSubscriberTest {

	@Test
	public void testEnsureSubscriptionExistsCreatesSubscriptionWithRetryPolicy() {
		SubscriptionAdminClient subscriptionAdminClient = Mockito.mock(
			SubscriptionAdminClient.class);

		Mockito.when(
			subscriptionAdminClient.getSubscription(
				ArgumentMatchers.any(ProjectSubscriptionName.class))
		).thenThrow(
			new NotFoundException(
				new RuntimeException(), Mockito.mock(StatusCode.class), false)
		);

		_ensureSubscriptionExists(subscriptionAdminClient);

		ArgumentCaptor<Subscription> argumentCaptor = ArgumentCaptor.forClass(
			Subscription.class);

		Mockito.verify(
			subscriptionAdminClient
		).createSubscription(
			argumentCaptor.capture()
		);

		Subscription subscription = argumentCaptor.getValue();

		RetryPolicy retryPolicy = subscription.getRetryPolicy();

		Assertions.assertEquals(
			600,
			retryPolicy.getMaximumBackoff(
			).getSeconds());
		Assertions.assertEquals(
			60,
			retryPolicy.getMinimumBackoff(
			).getSeconds());

		Assertions.assertEquals(
			5,
			subscription.getDeadLetterPolicy(
			).getMaxDeliveryAttempts());
	}

	@Test
	public void testEnsureSubscriptionExistsLeavesExistingSubscriptionAlone() {
		SubscriptionAdminClient subscriptionAdminClient = Mockito.mock(
			SubscriptionAdminClient.class);

		_ensureSubscriptionExists(subscriptionAdminClient);

		Mockito.verify(
			subscriptionAdminClient, Mockito.never()
		).createSubscription(
			ArgumentMatchers.any(Subscription.class)
		);

		Mockito.verify(
			subscriptionAdminClient
		).getSubscription(
			ProjectSubscriptionName.of("project", "subscription")
		);
	}

	@Test
	public void testInitializeDoesNotStartSubscriberWhenProjectIdIsBlank() {
		TestPubsubSubscriber testPubsubSubscriber = new TestPubsubSubscriber(
			StringPool.BLANK);

		Assertions.assertDoesNotThrow(testPubsubSubscriber::initialize);

		Assertions.assertNull(
			ReflectionTestUtils.getField(testPubsubSubscriber, "_subscriber"));
	}

	@Test
	public void testStopDoesNothingWhenSubscriberWasNeverStarted() {
		TestPubsubSubscriber testPubsubSubscriber = new TestPubsubSubscriber(
			StringPool.BLANK);

		Assertions.assertDoesNotThrow(testPubsubSubscriber::stop);
	}

	private void _ensureSubscriptionExists(
		SubscriptionAdminClient subscriptionAdminClient) {

		try (MockedStatic<SubscriptionAdminClient> mockedStatic =
				Mockito.mockStatic(SubscriptionAdminClient.class)) {

			mockedStatic.when(
				() -> SubscriptionAdminClient.create(
					ArgumentMatchers.any(SubscriptionAdminSettings.class))
			).thenReturn(
				subscriptionAdminClient
			);

			ReflectionTestUtils.invokeMethod(
				new TestPubsubSubscriber("project"),
				"_ensureSubscriptionExists",
				ProjectSubscriptionName.of("project", "subscription"), "topic");
		}
	}

	private static class TestPubsubSubscriber extends BasePubsubSubscriber {

		@Override
		public void receive(Message message) {
		}

		@Override
		protected CredentialsProvider getCredentialsProvider() {
			return NoCredentialsProvider.create();
		}

		@Override
		protected String getProjectId() {
			return _projectId;
		}

		private TestPubsubSubscriber(String projectId) {
			_projectId = projectId;
		}

		private final String _projectId;

	}

}