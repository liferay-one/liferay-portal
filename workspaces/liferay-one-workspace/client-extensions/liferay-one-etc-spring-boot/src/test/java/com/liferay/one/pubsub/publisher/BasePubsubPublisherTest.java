/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.pubsub.publisher;

import com.google.api.core.ApiFuture;
import com.google.api.gax.core.CredentialsProvider;
import com.google.api.gax.core.NoCredentialsProvider;
import com.google.cloud.pubsub.v1.Publisher;
import com.google.pubsub.v1.PubsubMessage;
import com.google.pubsub.v1.TopicName;

import com.liferay.one.pubsub.Message;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-BASEPUBSUBPUBLISHER] BasePubsubPublisher")
public class BasePubsubPublisherTest {

	@BeforeEach
	public void setUp() throws Exception {
		_apiFuture = Mockito.mock(ApiFuture.class);

		Mockito.when(
			_apiFuture.get(ArgumentMatchers.anyLong(), ArgumentMatchers.any())
		).thenReturn(
			"message-id"
		);

		_publisherMockedStatic = Mockito.mockStatic(Publisher.class);

		_publisherMockedStatic.when(
			() -> Publisher.newBuilder(ArgumentMatchers.any(TopicName.class))
		).thenAnswer(
			invocation -> {
				Publisher.Builder builder = Mockito.mock(
					Publisher.Builder.class, Mockito.RETURNS_SELF);

				Publisher publisher = Mockito.mock(Publisher.class);

				Mockito.when(
					publisher.publish(ArgumentMatchers.any(PubsubMessage.class))
				).thenReturn(
					_apiFuture
				);

				Mockito.when(
					builder.build()
				).thenReturn(
					publisher
				);

				_publishers.add(publisher);

				return builder;
			}
		);
	}

	@AfterEach
	public void tearDown() {
		_publisherMockedStatic.close();
	}

	@Test
	public void testPublishBuildsMessageWithOrderingKey() throws Exception {
		TestPubsubPublisher testPubsubPublisher = new TestPubsubPublisher();

		testPubsubPublisher.publish(_createMessage("orders"));

		Publisher publisher = _publishers.get(0);

		ArgumentCaptor<PubsubMessage> argumentCaptor = ArgumentCaptor.forClass(
			PubsubMessage.class);

		Mockito.verify(
			publisher
		).publish(
			argumentCaptor.capture()
		);

		PubsubMessage pubsubMessage = argumentCaptor.getValue();

		Assertions.assertEquals(
			"value", pubsubMessage.getAttributesOrThrow("key"));
		Assertions.assertEquals(
			"payload",
			pubsubMessage.getData(
			).toStringUtf8());
		Assertions.assertEquals(
			TestPubsubPublisher.class.getName(),
			pubsubMessage.getOrderingKey());

		Mockito.verify(
			_apiFuture
		).get(
			60, TimeUnit.SECONDS
		);

		_publisherMockedStatic.verify(
			() -> Publisher.newBuilder(
				TopicName.ofProjectTopicName("project", "dev-orders")));
	}

	@Test
	public void testPublishCreatesTopicWhenAutoCreateTopicIsEnabled()
		throws Exception {

		TestPubsubPublisher testPubsubPublisher = new TestPubsubPublisher();

		testPubsubPublisher.autoCreateTopic = true;

		testPubsubPublisher.publish(_createMessage("orders"));

		Assertions.assertEquals(
			List.of("orders"), testPubsubPublisher.ensuredTopics);
	}

	@Test
	public void testPublishRethrowsOtherExceptionsAfterHandling()
		throws Exception {

		TimeoutException timeoutException = new TimeoutException();

		Mockito.when(
			_apiFuture.get(ArgumentMatchers.anyLong(), ArgumentMatchers.any())
		).thenThrow(
			timeoutException
		);

		TestPubsubPublisher testPubsubPublisher = new TestPubsubPublisher();

		Assertions.assertSame(
			timeoutException,
			Assertions.assertThrows(
				TimeoutException.class,
				() -> testPubsubPublisher.publish(_createMessage("orders"))));
	}

	@Test
	public void testPublishReusesCachedPublisherPerTopic() throws Exception {
		TestPubsubPublisher testPubsubPublisher = new TestPubsubPublisher();

		testPubsubPublisher.publish(_createMessage("orders"));
		testPubsubPublisher.publish(_createMessage("orders"));
		testPubsubPublisher.publish(_createMessage("accounts"));

		Assertions.assertEquals(2, _publishers.size());
		Assertions.assertTrue(testPubsubPublisher.ensuredTopics.isEmpty());

		Mockito.verify(
			_publishers.get(0), Mockito.times(2)
		).publish(
			ArgumentMatchers.any(PubsubMessage.class)
		);
	}

	@Test
	public void testPublishUnwrapsExecutionExceptionBeforeHandlingError()
		throws Exception {

		IllegalStateException illegalStateException = new IllegalStateException(
			"Unable to publish");

		Mockito.when(
			_apiFuture.get(ArgumentMatchers.anyLong(), ArgumentMatchers.any())
		).thenThrow(
			new ExecutionException(illegalStateException)
		);

		TestPubsubPublisher testPubsubPublisher = new TestPubsubPublisher();

		Assertions.assertSame(
			illegalStateException,
			Assertions.assertThrows(
				IllegalStateException.class,
				() -> testPubsubPublisher.publish(_createMessage("orders"))));
	}

	@Test
	public void testShutdownLogsInsteadOfThrowingWhenPublisherFailsToStop()
		throws Exception {

		TestPubsubPublisher testPubsubPublisher = new TestPubsubPublisher();

		testPubsubPublisher.publish(_createMessage("orders"));

		Publisher publisher = _publishers.get(0);

		Mockito.doThrow(
			new IllegalStateException("Unable to stop")
		).when(
			publisher
		).shutdown();

		Assertions.assertDoesNotThrow(testPubsubPublisher::shutdown);
	}

	@Test
	public void testShutdownStopsEveryPublisher() throws Exception {
		TestPubsubPublisher testPubsubPublisher = new TestPubsubPublisher();

		testPubsubPublisher.publish(_createMessage("accounts"));
		testPubsubPublisher.publish(_createMessage("orders"));

		testPubsubPublisher.shutdown();

		for (Publisher publisher : _publishers) {
			Mockito.verify(
				publisher
			).shutdown();

			Mockito.verify(
				publisher
			).awaitTermination(
				1, TimeUnit.MINUTES
			);
		}
	}

	private Message _createMessage(String topic) {
		return new Message(
			HashMapBuilder.put(
				"key", "value"
			).build(),
			"payload", topic);
	}

	private ApiFuture<String> _apiFuture;
	private MockedStatic<Publisher> _publisherMockedStatic;
	private final List<Publisher> _publishers = new ArrayList<>();

	private static class TestPubsubPublisher extends BasePubsubPublisher {

		public boolean autoCreateTopic;
		public final List<String> ensuredTopics = new ArrayList<>();

		@Override
		protected void ensureTopicExists(String topic) {
			ensuredTopics.add(topic);
		}

		@Override
		protected CredentialsProvider getCredentialsProvider() {
			return NoCredentialsProvider.create();
		}

		@Override
		protected String getNamespace() {
			return "dev-";
		}

		@Override
		protected String getProjectId() {
			return "project";
		}

		@Override
		protected boolean isAutoCreateTopic() {
			return autoCreateTopic;
		}

	}

}