/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.petra.string.StringPool;

import java.nio.charset.StandardCharsets;

import java.util.Base64;

import org.springframework.beans.factory.annotation.Value;

/**
 * @author Drew Brokke
 */
public abstract class BaseJiraService extends BaseService {

	protected String getAuthorization() {
		Base64.Encoder encoder = Base64.getEncoder();

		String credentials =
			_jiraAPIEmailAddress + StringPool.COLON + _jiraAPIToken;

		String encodedString = encoder.encodeToString(
			credentials.getBytes(StandardCharsets.UTF_8));

		return "Basic " + encodedString;
	}

	@Value("${liferay.one.jira.api.email.address}")
	private String _jiraAPIEmailAddress;

	@Value("${liferay.one.jira.api.token}")
	private String _jiraAPIToken;

}