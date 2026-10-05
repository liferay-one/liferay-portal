/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.ClassNameConstants;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.SubscriptionEntry;
import com.liferay.petra.string.StringBundler;

import java.util.Collections;
import java.util.Date;
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

import org.springframework.context.MessageSource;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CRON-SCHEDULEDSENDEXPIRINGLICENSEKEYEMAILS] " +
		"SubscriptionEntryService#scheduledSendExpiringLicenseKeyEmails"
)
public class SubscriptionEntryServiceScheduledSendExpiringLicenseKeyEmailsTest {

	@BeforeEach
	public void setUp() throws Exception {
		_accountService = Mockito.mock(AccountService.class);
		_activationKeyService = Mockito.mock(ActivationKeyService.class);
		_licenseKeyService = Mockito.mock(LicenseKeyService.class);
		_notificationQueueEntryService = Mockito.mock(
			NotificationQueueEntryService.class);
		_notificationTemplateService = Mockito.mock(
			NotificationTemplateService.class);
		_userAccountService = Mockito.mock(UserAccountService.class);

		MessageSource messageSource = Mockito.mock(MessageSource.class);

		Mockito.when(
			messageSource.getMessage(
				ArgumentMatchers.anyString(), ArgumentMatchers.any(),
				ArgumentMatchers.any())
		).thenReturn(
			"message"
		);

		_subscriptionEntryService = Mockito.spy(new SubscriptionEntryService());

		ReflectionTestUtils.setField(
			_subscriptionEntryService, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			_subscriptionEntryService, "_activationKeyService",
			_activationKeyService);
		ReflectionTestUtils.setField(
			_subscriptionEntryService, "_licenseKeyService",
			_licenseKeyService);
		ReflectionTestUtils.setField(
			_subscriptionEntryService, "_messageSource", messageSource);
		ReflectionTestUtils.setField(
			_subscriptionEntryService, "_notificationQueueEntryService",
			_notificationQueueEntryService);
		ReflectionTestUtils.setField(
			_subscriptionEntryService, "_notificationTemplateService",
			_notificationTemplateService);
		ReflectionTestUtils.setField(
			_subscriptionEntryService, "_userAccountService",
			_userAccountService);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			new Account()
		);

		Mockito.when(
			_activationKeyService.getExpiringActivationKeys(
				ArgumentMatchers.any(Date.class),
				ArgumentMatchers.any(Date.class),
				ArgumentMatchers.any(Date.class))
		).thenReturn(
			Collections.emptyList()
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeys(ArgumentMatchers.anyString())
		).thenReturn(
			Collections.emptyList()
		);

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

		_mockUserAccount(_USER_ID, "user@liferay.com", "fr_FR");

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			_subscriptionEntryService
		).getSubscriptionEntries(
			ArgumentMatchers.anyString()
		);
	}

	@Test
	public void testScheduledSendExpiringLicenseKeyEmailsChecksEveryOffset()
		throws Exception {

		_subscriptionEntryService.scheduledSendExpiringLicenseKeyEmails();

		Mockito.verify(
			_activationKeyService, Mockito.times(3)
		).getExpiringActivationKeys(
			ArgumentMatchers.any(Date.class), ArgumentMatchers.any(Date.class),
			ArgumentMatchers.any(Date.class)
		);

		Mockito.verify(
			_licenseKeyService, Mockito.times(3)
		).getLicenseKeys(
			ArgumentMatchers.startsWith(
				"(active eq true) and (customExpirationDate gt ")
		);

		Mockito.verifyNoInteractions(_notificationQueueEntryService);
	}

	@Test
	public void testScheduledSendExpiringLicenseKeyEmailsSendsActivationKeyEmails()
		throws Exception {

		ActivationKey activationKey = Mockito.mock(ActivationKey.class);

		Mockito.when(
			activationKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			activationKey.getActivationKeyId()
		).thenReturn(
			_ACTIVATION_KEY_ID
		);

		Mockito.when(
			_activationKeyService.getExpiringActivationKeys(
				ArgumentMatchers.any(Date.class),
				ArgumentMatchers.any(Date.class),
				ArgumentMatchers.any(Date.class))
		).thenReturn(
			List.of(activationKey), Collections.emptyList(),
			Collections.emptyList()
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByActivationKeyId(
				_ACTIVATION_KEY_ID)
		).thenReturn(
			List.of(_createLicenseKey(_ACTIVATION_KEY_ID))
		);

		Mockito.doReturn(
			List.of(
				_createSubscriptionEntry(
					ClassNameConstants.ACTIVATION_KEY, _ACTIVATION_KEY_ID,
					_USER_ID))
		).when(
			_subscriptionEntryService
		).getSubscriptionEntries(
			StringBundler.concat(
				"(className eq '", ClassNameConstants.ACTIVATION_KEY,
				"') and (classPK eq ", _ACTIVATION_KEY_ID, ")")
		);

		_subscriptionEntryService.scheduledSendExpiringLicenseKeyEmails();

		Mockito.verify(
			_notificationTemplateService
		).getAndProcessTemplateJSONObject(
			ArgumentMatchers.eq("LICENSE-KEY-EXPIRATION-WARNING"),
			ArgumentMatchers.eq("en_US"), ArgumentMatchers.anyMap()
		);

		_verifyNotificationQueueEntries(1);
	}

	@Test
	public void testScheduledSendExpiringLicenseKeyEmailsSendsAgainOnRerun()
		throws Exception {

		Mockito.when(
			_licenseKeyService.getLicenseKeys(ArgumentMatchers.anyString())
		).thenReturn(
			List.of(_createLicenseKey(0)), Collections.emptyList(),
			Collections.emptyList(), List.of(_createLicenseKey(0)),
			Collections.emptyList(), Collections.emptyList()
		);

		_mockSubscriptionEntries(ClassNameConstants.LICENSE_KEY, _USER_ID);

		_subscriptionEntryService.scheduledSendExpiringLicenseKeyEmails();

		_verifyNotificationQueueEntries(1);

		_subscriptionEntryService.scheduledSendExpiringLicenseKeyEmails();

		_verifyNotificationQueueEntries(2);
	}

	@Test
	public void testScheduledSendExpiringLicenseKeyEmailsSendsLicenseKeyEmails()
		throws Exception {

		_mockUserAccount(_USER_ID, "user@liferay.com", "ja_JP");

		Mockito.when(
			_licenseKeyService.getLicenseKeys(ArgumentMatchers.anyString())
		).thenReturn(
			List.of(_createLicenseKey(0)), Collections.emptyList(),
			Collections.emptyList()
		);

		_mockSubscriptionEntries(ClassNameConstants.LICENSE_KEY, _USER_ID);

		_subscriptionEntryService.scheduledSendExpiringLicenseKeyEmails();

		ArgumentCaptor<Map<String, String>> argumentCaptor =
			ArgumentCaptor.forClass(Map.class);

		Mockito.verify(
			_notificationTemplateService
		).getAndProcessTemplateJSONObject(
			ArgumentMatchers.eq("LICENSE-KEY-EXPIRATION-WARNING"),
			ArgumentMatchers.eq("ja_JP"), argumentCaptor.capture()
		);

		Map<String, String> placeholders = argumentCaptor.getValue();

		Assertions.assertEquals(
			"Enterprise", placeholders.get("LICENSE_KEY_LICENSE_NAME"));
		Assertions.assertEquals("Jane", placeholders.get("USER_FIRST_NAME"));

		Mockito.verify(
			_notificationQueueEntryService
		).addNotificationQueueEntry(
			"customer-service@liferay.com", "Liferay Support",
			"user@liferay.com", "Subject", "Body"
		);
	}

	@Test
	public void testScheduledSendExpiringLicenseKeyEmailsSkipsIneligibleLicenseKeys()
		throws Exception {

		Mockito.when(
			_licenseKeyService.getLicenseKeys(ArgumentMatchers.anyString())
		).thenReturn(
			List.of(
				_createLicenseKey(_ACTIVATION_KEY_ID),
				_createLicenseKey(0, 999L)),
			List.of(_createLicenseKey(0)), Collections.emptyList()
		);

		_mockSubscriptionEntries(ClassNameConstants.LICENSE_KEY, 8L);
		_mockUserAccount(8L, "", "en_US");

		_subscriptionEntryService.scheduledSendExpiringLicenseKeyEmails();

		Mockito.verify(
			_accountService, Mockito.times(1)
		).fetchAccount(
			_ACCOUNT_ID
		);

		Mockito.verify(
			_accountService
		).fetchAccount(
			999L
		);

		Mockito.verify(
			_userAccountService
		).getUserAccount(
			8L
		);

		Mockito.verifyNoInteractions(
			_notificationQueueEntryService, _notificationTemplateService);
	}

	private LicenseKey _createLicenseKey(long activationKeyId) {
		return _createLicenseKey(activationKeyId, _ACCOUNT_ID);
	}

	private LicenseKey _createLicenseKey(long activationKeyId, long accountId) {
		return new LicenseKey(
			new JSONObject(
			).put(
				"customExpirationDate", "2026-11-04T00:00:00Z"
			).put(
				"id", _LICENSE_KEY_ID
			).put(
				"licenseName", "Enterprise"
			).put(
				"productName", "DXP"
			).put(
				"productVersion", "2026.Q1"
			).put(
				"r_accountEntryToLicenseKey_accountEntryId", accountId
			).put(
				"r_activationKeyToLicenseKey_c_activationKeyId", activationKeyId
			).put(
				"sizing", "4 cores"
			));
	}

	private SubscriptionEntry _createSubscriptionEntry(
		String className, long classPK, long userId) {

		return new SubscriptionEntry(
			new JSONObject(
			).put(
				"className", className
			).put(
				"classPK", classPK
			).put(
				"customUserId", userId
			).put(
				"id", 1L
			));
	}

	private void _mockSubscriptionEntries(String className, long userId)
		throws Exception {

		Mockito.doReturn(
			List.of(
				_createSubscriptionEntry(className, _LICENSE_KEY_ID, userId))
		).when(
			_subscriptionEntryService
		).getSubscriptionEntries(
			StringBundler.concat(
				"(className eq '", className, "') and (classPK eq ",
				_LICENSE_KEY_ID, ")")
		);
	}

	private void _mockUserAccount(
			long userId, String emailAddress, String languageId)
		throws Exception {

		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(emailAddress);
		userAccount.setGivenName("Jane");
		userAccount.setLanguageId(languageId);

		Mockito.when(
			_userAccountService.getUserAccount(userId)
		).thenReturn(
			userAccount
		);
	}

	private void _verifyNotificationQueueEntries(int times) throws Exception {
		Mockito.verify(
			_notificationQueueEntryService, Mockito.times(times)
		).addNotificationQueueEntry(
			"customer-service@liferay.com", "Liferay Support",
			"user@liferay.com", "Subject", "Body"
		);
	}

	private static final long _ACCOUNT_ID = 100L;

	private static final long _ACTIVATION_KEY_ID = 200L;

	private static final long _LICENSE_KEY_ID = 300L;

	private static final long _USER_ID = 7L;

	private AccountService _accountService;
	private ActivationKeyService _activationKeyService;
	private LicenseKeyService _licenseKeyService;
	private NotificationQueueEntryService _notificationQueueEntryService;
	private NotificationTemplateService _notificationTemplateService;
	private SubscriptionEntryService _subscriptionEntryService;
	private UserAccountService _userAccountService;

}