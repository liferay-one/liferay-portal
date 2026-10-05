/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import java.nio.charset.StandardCharsets;

import java.util.Base64;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-BASEJIRASERVICE] BaseJiraService")
public class BaseJiraServiceTest {

	@Test
	public void testGetAuthorizationEncodesCredentialsAsBasic() {
		Assertions.assertEquals(
			"Basic " + _encode("jira@liferay.com:token"),
			_createTestJiraService(
				"jira@liferay.com", "token"
			).getAuthorization());
	}

	@Test
	public void testGetAuthorizationEncodesUTF8() {
		String authorization = _createTestJiraService(
			"josé@liferay.com", "töken"
		).getAuthorization();

		Assertions.assertTrue(authorization.startsWith("Basic "));

		Base64.Decoder decoder = Base64.getDecoder();

		Assertions.assertEquals(
			"josé@liferay.com:töken",
			new String(
				decoder.decode(authorization.substring(6)),
				StandardCharsets.UTF_8));
	}

	private TestJiraService _createTestJiraService(
		String emailAddress, String token) {

		TestJiraService testJiraService = new TestJiraService();

		ReflectionTestUtils.setField(
			testJiraService, "_jiraAPIEmailAddress", emailAddress);
		ReflectionTestUtils.setField(testJiraService, "_jiraAPIToken", token);

		return testJiraService;
	}

	private String _encode(String value) {
		Base64.Encoder encoder = Base64.getEncoder();

		return encoder.encodeToString(value.getBytes(StandardCharsets.UTF_8));
	}

	private static class TestJiraService extends BaseJiraService {

		@Override
		public String getAuthorization() {
			return super.getAuthorization();
		}

	}

}