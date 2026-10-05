/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.constants.AccountInvitationConstants;
import com.liferay.one.model.AccountInvitation;
import com.liferay.one.model.Project;

import java.time.Year;

import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[SVC-ACCOUNTINVITATIONEMAILSERVICE] AccountInvitationEmailService"
)
public class AccountInvitationEmailServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		ReflectionTestUtils.setField(
			_accountInvitationEmailService, "_emailAddressGlobal",
			"noreply@example.com");
		ReflectionTestUtils.setField(
			_accountInvitationEmailService, "_notificationQueueEntryService",
			_notificationQueueEntryService);
		ReflectionTestUtils.setField(
			_accountInvitationEmailService, "_notificationTemplateService",
			_notificationTemplateService);
		ReflectionTestUtils.setField(
			_accountInvitationEmailService, "_portalURL",
			"https://one.example.com");

		Mockito.when(
			_notificationTemplateService.getAndProcessTemplateJSONObject(
				ArgumentMatchers.anyString(), ArgumentMatchers.anyString(),
				ArgumentMatchers.anyMap())
		).thenReturn(
			new JSONObject(
			).put(
				"body", "Body"
			).put(
				"subject", "Subject"
			)
		);
	}

	@Test
	public void testSendInvitationEmail() throws Exception {
		Year beforeYear = Year.now();

		_accountInvitationEmailService.sendInvitationEmail(
			_createAccount(), _createAccountInvitation(), "<b>Inviter</b>");

		Year afterYear = Year.now();

		Map<String, String> placeholders = _capturePlaceholders(
			AccountInvitationConstants.
				NOTIFICATION_TEMPLATE_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(
			"https://one.example.com/account-invitation?token=a%2Bb%3Dc%26d",
			placeholders.get("ACCEPT_URL"));
		Assertions.assertEquals(
			"Acme &amp; Co", placeholders.get("ACCOUNT_NAME"));
		Assertions.assertEquals(
			"&lt;b&gt;Inviter&lt;/b&gt;", placeholders.get("INVITER_NAME"));
		Assertions.assertFalse(placeholders.containsKey("PROJECT_NAME"));
		Assertions.assertEquals("Jane", placeholders.get("USER_FIRST_NAME"));
		Assertions.assertTrue(
			List.of(
				beforeYear.toString(), afterYear.toString()
			).contains(
				placeholders.get("YEAR")
			));

		_verifyNotificationQueueEntry();
	}

	@Test
	public void testSendInvitationEmailWithProject() throws Exception {
		_accountInvitationEmailService.sendInvitationEmail(
			_createAccount(), _createAccountInvitation(), "Inviter",
			new Project(
				new JSONObject(
				).put(
					"name", "Project <One>"
				)));

		Map<String, String> placeholders = _capturePlaceholders(
			AccountInvitationConstants.
				PROJECT_NOTIFICATION_TEMPLATE_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(
			"https://one.example.com/account-invitation?token=a%2Bb%3Dc%26d",
			placeholders.get("ACCEPT_URL"));
		Assertions.assertEquals(
			"Project &lt;One&gt;", placeholders.get("PROJECT_NAME"));

		_verifyNotificationQueueEntry();
	}

	private Map<String, String> _capturePlaceholders(
			String externalReferenceCode)
		throws Exception {

		ArgumentCaptor<Map<String, String>> argumentCaptor =
			ArgumentCaptor.forClass(Map.class);

		Mockito.verify(
			_notificationTemplateService
		).getAndProcessTemplateJSONObject(
			ArgumentMatchers.eq(externalReferenceCode),
			ArgumentMatchers.eq("en_US"), argumentCaptor.capture()
		);

		return argumentCaptor.getValue();
	}

	private Account _createAccount() {
		Account account = new Account();

		account.setName("Acme & Co");

		return account;
	}

	private AccountInvitation _createAccountInvitation() {
		return new AccountInvitation(
			new JSONObject(
			).put(
				"emailAddress", "jane@example.com"
			).put(
				"givenName", "Jane"
			).put(
				"id", 1
			).put(
				"token", "a+b=c&d"
			));
	}

	private void _verifyNotificationQueueEntry() throws Exception {
		Mockito.verify(
			_notificationQueueEntryService
		).addNotificationQueueEntry(
			"noreply@example.com", "Liferay One", "jane@example.com", "Subject",
			"Body"
		);
	}

	private final AccountInvitationEmailService _accountInvitationEmailService =
		new AccountInvitationEmailService();
	private final NotificationQueueEntryService _notificationQueueEntryService =
		Mockito.mock(NotificationQueueEntryService.class);
	private final NotificationTemplateService _notificationTemplateService =
		Mockito.mock(NotificationTemplateService.class);

}