/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.pubsub;

import com.google.api.gax.core.CredentialsProvider;
import com.google.api.gax.core.NoCredentialsProvider;
import com.google.api.gax.rpc.NotFoundException;
import com.google.api.gax.rpc.StatusCode;
import com.google.cloud.pubsub.v1.TopicAdminClient;
import com.google.cloud.pubsub.v1.TopicAdminSettings;
import com.google.pubsub.v1.TopicName;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-BASEPUBSUBCLIENT] BasePubsubClient")
public class BasePubsubClientTest {

	@BeforeEach
	public void setUp() {
		_topicAdminClient = Mockito.mock(TopicAdminClient.class);

		_topicAdminClientMockedStatic = Mockito.mockStatic(
			TopicAdminClient.class);

		_topicAdminClientMockedStatic.when(
			() -> TopicAdminClient.create(
				ArgumentMatchers.any(TopicAdminSettings.class))
		).thenReturn(
			_topicAdminClient
		);
	}

	@AfterEach
	public void tearDown() {
		_topicAdminClientMockedStatic.close();
	}

	@Test
	public void testEnsureDeadLetterTopicExistsCreatesMissingTopicWithNamespace()
		throws Exception {

		Mockito.when(
			_topicAdminClient.getTopic(ArgumentMatchers.any(TopicName.class))
		).thenThrow(
			new NotFoundException(
				new RuntimeException(), Mockito.mock(StatusCode.class), false)
		);

		new TestPubsubClient(
			true
		).ensureDeadLetterTopicExists();

		Mockito.verify(
			_topicAdminClient
		).createTopic(
			TopicName.ofProjectTopicName(
				"project", "dev-one-liferay-dead-letter")
		);
	}

	@Test
	public void testEnsureDeadLetterTopicExistsLeavesExistingTopicAlone()
		throws Exception {

		new TestPubsubClient(
			true
		).ensureDeadLetterTopicExists();

		Mockito.verify(
			_topicAdminClient
		).getTopic(
			TopicName.ofProjectTopicName(
				"project", "dev-one-liferay-dead-letter")
		);

		Mockito.verify(
			_topicAdminClient, Mockito.never()
		).createTopic(
			ArgumentMatchers.any(TopicName.class)
		);

		Mockito.verify(
			_topicAdminClient
		).close();
	}

	@Test
	public void testEnsureDeadLetterTopicExistsSkipsWhenDisabled()
		throws Exception {

		new TestPubsubClient(
			false
		).ensureDeadLetterTopicExists();

		_topicAdminClientMockedStatic.verify(
			() -> TopicAdminClient.create(
				ArgumentMatchers.any(TopicAdminSettings.class)),
			Mockito.never());
	}

	@Test
	public void testEnsureTopicExistsChecksDeadLetterTopicOnlyWhenEnabled()
		throws Exception {

		new TestPubsubClient(
			false
		).ensureTopicExists(
			"orders"
		);

		Mockito.verify(
			_topicAdminClient
		).getTopic(
			TopicName.ofProjectTopicName("project", "dev-orders")
		);

		Mockito.verify(
			_topicAdminClient, Mockito.times(1)
		).getTopic(
			ArgumentMatchers.any(TopicName.class)
		);

		new TestPubsubClient(
			true
		).ensureTopicExists(
			"orders"
		);

		Mockito.verify(
			_topicAdminClient
		).getTopic(
			TopicName.ofProjectTopicName(
				"project", "dev-one-liferay-dead-letter")
		);
	}

	private TopicAdminClient _topicAdminClient;
	private MockedStatic<TopicAdminClient> _topicAdminClientMockedStatic;

	private static class TestPubsubClient extends BasePubsubClient {

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
		protected boolean isDeadLetterTopicEnabled() {
			return _deadLetterTopicEnabled;
		}

		private TestPubsubClient(boolean deadLetterTopicEnabled) {
			_deadLetterTopicEnabled = deadLetterTopicEnabled;
		}

		private final boolean _deadLetterTopicEnabled;

	}

}