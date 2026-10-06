/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.pubsub.subscriber;

import com.google.cloud.pubsub.v1.SubscriptionAdminClient;
import com.google.cloud.pubsub.v1.SubscriptionAdminSettings;
import com.google.pubsub.v1.ProjectSubscriptionName;
import com.google.pubsub.v1.Subscription;
import com.google.pubsub.v1.TopicName;

import com.liferay.one.pubsub.Message;
import com.liferay.one.service.NotificationQueueEntryService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.HtmlUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/**
 * @author Kyle Bischof
 */
public abstract class BaseDeadLetterPubsubSubscriber
	extends BasePubsubSubscriber {

	public static final String SOURCE_DELIVERY_COUNT_ATTRIBUTE_NAME =
		"CloudPubSubDeadLetterSourceDeliveryCount";

	public static final String SOURCE_SUBSCRIPTION_ATTRIBUTE_NAME =
		"CloudPubSubDeadLetterSourceSubscription";

	@Override
	public String getTopic() {
		return getDeadLetterTopic();
	}

	@Override
	public final void receive(Message message) throws Exception {
		onDeadLetter(
			GetterUtil.getInteger(
				message.get(SOURCE_DELIVERY_COUNT_ATTRIBUTE_NAME)),
			message, message.get(SOURCE_SUBSCRIPTION_ATTRIBUTE_NAME));
	}

	protected String getSourceTopic(String sourceSubscriptionName)
		throws Exception {

		String sourceTopic = _topics.get(sourceSubscriptionName);

		if (sourceTopic != null) {
			return sourceTopic;
		}

		SubscriptionAdminSettings subscriptionAdminSettings =
			SubscriptionAdminSettings.newBuilder(
			).setCredentialsProvider(
				getCredentialsProvider()
			).build();

		try (SubscriptionAdminClient subscriptionAdminClient =
				SubscriptionAdminClient.create(subscriptionAdminSettings)) {

			Subscription subscription = subscriptionAdminClient.getSubscription(
				ProjectSubscriptionName.of(
					getProjectId(), sourceSubscriptionName));

			TopicName topicName = TopicName.parse(subscription.getTopic());

			_topics.put(sourceSubscriptionName, topicName.getTopic());

			return topicName.getTopic();
		}
	}

	@Override
	protected final boolean isDeadLetterTopicEnabled() {
		return false;
	}

	protected void onDeadLetter(
		int deliveryAttempt, Message message, String sourceSubscriptionName) {

		try {
			_log.error(
				StringBundler.concat(
					"Unable to process message from source subscription ",
					sourceSubscriptionName, " after ", deliveryAttempt,
					" delivery attempts ", message));

			_sendNotificationEmail(
				deliveryAttempt, message, sourceSubscriptionName);
		}
		catch (Exception exception) {
			_log.error("Unable to report the dead letter message", exception);
		}
	}

	private void _sendNotificationEmail(
			int deliveryAttempt, Message message, String sourceSubscriptionName)
		throws Exception {

		if (Validator.isNull(_notificationRecipient)) {
			return;
		}

		String body = StringBundler.concat(
			"<p>A message was moved to the dead letter topic after ",
			deliveryAttempt, " delivery attempts.</p><p>Source Subscription: ",
			HtmlUtil.escape(sourceSubscriptionName),
			"</p><p>Attributes:</p><pre>",
			HtmlUtil.escape(String.valueOf(message.getAttributes())),
			"</pre><p>Payload:</p><pre>", HtmlUtil.escape(message.getPayload()),
			"</pre>");

		_notificationQueueEntryService.addNotificationQueueEntry(
			_emailAddressGlobal, "Liferay One", _notificationRecipient,
			"Liferay One Dead Letter Notification", body);
	}

	private static final Log _log = LogFactory.getLog(
		BaseDeadLetterPubsubSubscriber.class);

	@Value("${liferay.one.provisioning.email.address.global}")
	private String _emailAddressGlobal;

	@Autowired
	private NotificationQueueEntryService _notificationQueueEntryService;

	@Value("${liferay.one.dead.letter.notification.recipient}")
	private String _notificationRecipient;

	private final Map<String, String> _topics = new ConcurrentHashMap<>();

}