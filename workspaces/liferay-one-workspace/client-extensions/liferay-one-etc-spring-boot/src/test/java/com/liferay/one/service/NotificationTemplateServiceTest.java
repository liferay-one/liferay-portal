/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.notification.rest.client.dto.v1_0.NotificationTemplate;

import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Franca
 */
public class NotificationTemplateServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_notificationTemplateService = new NotificationTemplateService();
	}

	@Test
	public void testGetProcessedTemplateJSONObjectFallsBackToDashedLanguageId()
		throws Exception {

		JSONObject jsonObject = _getProcessedTemplateJSONObject(
			"en_US",
			_createNotificationTemplate(
				"[%PROJECT_ID%]", "[%FROM_NAME%]", "[%SUBJECT%]",
				"[%TO_EMAIL%]"),
			Map.of(
				"FROM_NAME", "One Liferay", "PROJECT_ID", "PRJCT-001",
				"SUBJECT", "Activation request", "TO_EMAIL",
				"cloud-provisioning@liferay.com"));

		Assertions.assertEquals("PRJCT-001", jsonObject.getString("body"));
		Assertions.assertEquals(
			"Activation request", jsonObject.getString("subject"));
		Assertions.assertEquals(
			"One Liferay", jsonObject.getString("fromName"));
		Assertions.assertEquals(
			"cloud-provisioning@liferay.com", jsonObject.getString("to"));
	}

	@Test
	public void testGetProcessedTemplateJSONObjectFallsBackToDefaultLanguageId()
		throws Exception {

		JSONObject jsonObject = _getProcessedTemplateJSONObject(
			"pt_BR",
			_createNotificationTemplate(
				Map.of("pt_BR", "corpo"),
				Map.<String, Object>of(
					"from", "customer-service@liferay.com", "fromName",
					Map.of("en_US", "One Liferay"), "to",
					Map.of("en_US", "[%TO_EMAIL%]")),
				Map.of("pt_BR", "assunto")),
			Map.of("TO_EMAIL", "cloud-provisioning@liferay.com"));

		Assertions.assertEquals("corpo", jsonObject.getString("body"));
		Assertions.assertEquals("assunto", jsonObject.getString("subject"));
		Assertions.assertEquals(
			"One Liferay", jsonObject.getString("fromName"));
		Assertions.assertEquals(
			"cloud-provisioning@liferay.com", jsonObject.getString("to"));
	}

	@Test
	public void testGetProcessedTemplateJSONObjectReplacesRecipientPlaceholders()
		throws Exception {

		JSONObject jsonObject = _getProcessedTemplateJSONObject(
			"en-US",
			_createNotificationTemplate(
				"body", "[%FROM_NAME%]", "subject", "[%TO_EMAIL%]"),
			Map.of(
				"FROM_EMAIL", "do-not-reply@liferay.com", "FROM_NAME",
				"One Liferay", "TO_EMAIL", "cloud-provisioning@liferay.com"));

		Assertions.assertEquals(
			"do-not-reply@liferay.com", jsonObject.getString("from"));
		Assertions.assertEquals(
			"One Liferay", jsonObject.getString("fromName"));
		Assertions.assertEquals(
			"cloud-provisioning@liferay.com", jsonObject.getString("to"));
	}

	@Test
	public void testGetProcessedTemplateJSONObjectSupportsPlainStringRecipients()
		throws Exception {

		JSONObject jsonObject = _getProcessedTemplateJSONObject(
			_LANGUAGE_ID,
			_createNotificationTemplate(
				Map.of(_LANGUAGE_ID, "body"),
				Map.<String, Object>of(
					"from", "customer-service@liferay.com", "fromName",
					"One Liferay", "to", "[%TO_EMAIL%]"),
				Map.of(_LANGUAGE_ID, "subject")),
			Map.of("TO_EMAIL", "cloud-provisioning@liferay.com"));

		Assertions.assertEquals(
			"customer-service@liferay.com", jsonObject.getString("from"));
		Assertions.assertEquals(
			"One Liferay", jsonObject.getString("fromName"));
		Assertions.assertEquals(
			"cloud-provisioning@liferay.com", jsonObject.getString("to"));
	}

	private NotificationTemplate _createNotificationTemplate(
		Map<String, String> bodyMap, Map<String, Object> recipient,
		Map<String, String> subjectMap) {

		NotificationTemplate notificationTemplate = new NotificationTemplate();

		notificationTemplate.setBody(() -> bodyMap);
		notificationTemplate.setRecipients(() -> new Object[] {recipient});
		notificationTemplate.setSubject(() -> subjectMap);

		return notificationTemplate;
	}

	private NotificationTemplate _createNotificationTemplate(
		String body, String fromName, String subject, String to) {

		return _createNotificationTemplate(
			Map.of(_LANGUAGE_ID, body),
			Map.<String, Object>of(
				"from", "[%FROM_EMAIL%]", "fromName",
				Map.of(_LANGUAGE_ID, fromName), "to", Map.of(_LANGUAGE_ID, to)),
			Map.of(_LANGUAGE_ID, subject));
	}

	private JSONObject _getProcessedTemplateJSONObject(
		String languageId, NotificationTemplate notificationTemplate,
		Map<String, String> placeholders) {

		return ReflectionTestUtils.invokeMethod(
			_notificationTemplateService, "_getProcessedTemplateJSONObject",
			languageId, notificationTemplate, placeholders);
	}

	private static final String _LANGUAGE_ID = "en-US";

	private NotificationTemplateService _notificationTemplateService;

}