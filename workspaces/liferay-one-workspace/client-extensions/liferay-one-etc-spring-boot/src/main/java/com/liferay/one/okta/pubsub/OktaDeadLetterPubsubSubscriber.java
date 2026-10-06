/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.okta.pubsub;

import com.liferay.one.pubsub.subscriber.BaseDeadLetterPubsubSubscriber;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
@ConditionalOnProperty(
	havingValue = "true",
	name = "liferay.one.okta.dead.letter.pubsub.subscriber.enabled"
)
public class OktaDeadLetterPubsubSubscriber
	extends BaseDeadLetterPubsubSubscriber {

	@Override
	protected String getProjectId() {
		return _projectId;
	}

	@Override
	protected String getSubscriptionName() {
		return _subscription;
	}

	@Override
	protected boolean isAutoCreateSubscription() {
		return true;
	}

	@Value("${liferay.one.okta.dead.letter.pubsub.subscriber.project.id}")
	private String _projectId;

	@Value("${liferay.one.okta.dead.letter.pubsub.subscriber.subscription}")
	private String _subscription;

}