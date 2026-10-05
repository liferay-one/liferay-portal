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

import java.net.URI;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.context.MessageSource;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-SUBSCRIPTIONENTRYSERVICE] SubscriptionEntryService")
public class SubscriptionEntryServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		ReflectionTestUtils.setField(
			_testSubscriptionEntryService, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			_testSubscriptionEntryService, "_activationKeyService",
			_activationKeyService);
		ReflectionTestUtils.setField(
			_testSubscriptionEntryService, "_licenseKeyService",
			_licenseKeyService);
		ReflectionTestUtils.setField(
			_testSubscriptionEntryService, "_messageSource", _messageSource);
		ReflectionTestUtils.setField(
			_testSubscriptionEntryService, "_notificationQueueEntryService",
			_notificationQueueEntryService);
		ReflectionTestUtils.setField(
			_testSubscriptionEntryService, "_notificationTemplateService",
			_notificationTemplateService);
		ReflectionTestUtils.setField(
			_testSubscriptionEntryService, "_userAccountService",
			_userAccountService);

		Mockito.when(
			_accountService.fetchAccount(5L)
		).thenReturn(
			new Account()
		);

		Mockito.when(
			_messageSource.getMessage(
				ArgumentMatchers.anyString(), ArgumentMatchers.any(),
				ArgumentMatchers.any(Locale.class))
		).thenAnswer(
			invocation -> invocation.getArgument(0)
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
	}

	@Test
	public void testAddSubscriptionEntryPostsNewEntry() throws Exception {
		_testSubscriptionEntryService.postResponse = new JSONObject(
		).put(
			"className", "Class"
		).put(
			"classPK", 1
		).put(
			"customUserId", 2
		).put(
			"id", 3
		).toString();

		SubscriptionEntry subscriptionEntry =
			_testSubscriptionEntryService.addSubscriptionEntry("Class", 1L, 2L);

		Assertions.assertEquals(3, subscriptionEntry.getSubscriptionEntryId());

		Assertions.assertEquals(
			List.of(
				"(className eq 'Class') and (classPK eq 1) and (customUserId " +
					"eq 2)"),
			_testSubscriptionEntryService.filterStrings);
		Assertions.assertEquals(
			List.of("POST /o/c/subscriptionentries"),
			_testSubscriptionEntryService.requests);

		JSONObject jsonObject = new JSONObject(
			_testSubscriptionEntryService.bodies.get(0));

		Assertions.assertEquals("Class", jsonObject.getString("className"));
		Assertions.assertEquals(1, jsonObject.getLong("classPK"));
		Assertions.assertEquals(2, jsonObject.getLong("customUserId"));
	}

	@Test
	public void testAddSubscriptionEntryReturnsExistingEntry()
		throws Exception {

		_testSubscriptionEntryService.itemsFunction = filterString -> List.of(
			_createSubscriptionEntryJSONObject(9, 2));

		SubscriptionEntry subscriptionEntry =
			_testSubscriptionEntryService.addSubscriptionEntry(
				(Jwt)null, "Class", 1L, 2L);

		Assertions.assertEquals(9, subscriptionEntry.getSubscriptionEntryId());

		Assertions.assertTrue(_testSubscriptionEntryService.requests.isEmpty());
	}

	@Test
	public void testDeleteAccountActivationKeySubscriptionEntries()
		throws Exception {

		Mockito.when(
			_activationKeyService.getActivationKeys(
				"r_accountEntryToActivationKey_accountEntryId eq '5'")
		).thenReturn(
			List.of(
				new ActivationKey(
					new JSONObject(
					).put(
						"id", 11
					)))
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeys(
				"r_accountEntryToLicenseKey_accountEntryId eq '5'")
		).thenReturn(
			List.of(_createLicenseKey(0, 22))
		);

		_testSubscriptionEntryService.itemsFunction = filterString -> {
			if (filterString.contains("classPK eq 11")) {
				return List.of(_createSubscriptionEntryJSONObject(101, 2));
			}

			if (filterString.contains("classPK eq 22")) {
				return List.of(_createSubscriptionEntryJSONObject(202, 2));
			}

			return Collections.emptyList();
		};

		_testSubscriptionEntryService.
			deleteAccountActivationKeySubscriptionEntries(5L, 2L);

		Assertions.assertEquals(
			List.of(
				"DELETE /o/c/subscriptionentries/101",
				"DELETE /o/c/subscriptionentries/202"),
			_testSubscriptionEntryService.requests);
		Assertions.assertTrue(
			_testSubscriptionEntryService.filterStrings.get(
				0
			).contains(
				ClassNameConstants.ACTIVATION_KEY
			));
		Assertions.assertTrue(
			_testSubscriptionEntryService.filterStrings.get(
				1
			).contains(
				ClassNameConstants.LICENSE_KEY
			));
	}

	@Test
	public void testDeleteSubscriptionEntriesDeletesEveryEntryForUser()
		throws Exception {

		_testSubscriptionEntryService.itemsFunction = filterString -> List.of(
			_createSubscriptionEntryJSONObject(1, 2),
			_createSubscriptionEntryJSONObject(3, 2));

		_testSubscriptionEntryService.deleteSubscriptionEntries(2L);

		Assertions.assertEquals(
			List.of("(customUserId eq 2)"),
			_testSubscriptionEntryService.filterStrings);
		Assertions.assertEquals(
			List.of(
				"DELETE /o/c/subscriptionentries/1",
				"DELETE /o/c/subscriptionentries/3"),
			_testSubscriptionEntryService.requests);
	}

	@Test
	public void testDeleteSubscriptionEntrySkipsMissingEntry()
		throws Exception {

		_testSubscriptionEntryService.deleteSubscriptionEntry("Class", 1L, 2L);

		Assertions.assertTrue(_testSubscriptionEntryService.requests.isEmpty());
	}

	@Test
	public void testFetchSubscriptionEntryReturnsNullWithoutMatch()
		throws Exception {

		Assertions.assertNull(
			_testSubscriptionEntryService.fetchSubscriptionEntry(
				"Class", 1L, 2L));
	}

	@Test
	public void testScheduledSendExpiringLicenseKeyEmailsSelectsEachWindow()
		throws Exception {

		long now = System.currentTimeMillis();

		_testSubscriptionEntryService.scheduledSendExpiringLicenseKeyEmails();

		ArgumentCaptor<Date> endDateGTArgumentCaptor = ArgumentCaptor.forClass(
			Date.class);
		ArgumentCaptor<Date> endDateLTArgumentCaptor = ArgumentCaptor.forClass(
			Date.class);
		ArgumentCaptor<Date> startDateLTArgumentCaptor =
			ArgumentCaptor.forClass(Date.class);

		Mockito.verify(
			_activationKeyService, Mockito.times(3)
		).getExpiringActivationKeys(
			endDateGTArgumentCaptor.capture(),
			endDateLTArgumentCaptor.capture(),
			startDateLTArgumentCaptor.capture()
		);

		int[] days = {30, 14, 0};

		for (int i = 0; i < days.length; i++) {
			Assertions.assertEquals(
				days[i],
				_toDays(
					endDateGTArgumentCaptor.getAllValues(
					).get(
						i
					),
					now));
			Assertions.assertEquals(
				days[i] + 1,
				_toDays(
					endDateLTArgumentCaptor.getAllValues(
					).get(
						i
					),
					now));
			Assertions.assertEquals(
				days[i] - 60,
				_toDays(
					startDateLTArgumentCaptor.getAllValues(
					).get(
						i
					),
					now));
		}

		ArgumentCaptor<String> filterStringArgumentCaptor =
			ArgumentCaptor.forClass(String.class);

		Mockito.verify(
			_licenseKeyService, Mockito.times(3)
		).getLicenseKeys(
			filterStringArgumentCaptor.capture()
		);

		for (String filterString : filterStringArgumentCaptor.getAllValues()) {
			Assertions.assertTrue(
				filterString.startsWith(
					"(active eq true) and (customExpirationDate gt "),
				filterString);
		}
	}

	@Test
	public void testScheduledSendExpiringLicenseKeyEmailsSendsActivationKeyEmails()
		throws Exception {

		Mockito.when(
			_activationKeyService.getExpiringActivationKeys(
				ArgumentMatchers.any(), ArgumentMatchers.any(),
				ArgumentMatchers.any())
		).thenReturn(
			List.of(
				new ActivationKey(
					new JSONObject(
					).put(
						"id", 11
					).put(
						"r_accountEntryToActivationKey_accountEntryId", 5
					))),
			List.of(
				new ActivationKey(
					new JSONObject(
					).put(
						"id", 12
					).put(
						"r_accountEntryToActivationKey_accountEntryId", 5
					))),
			List.of(
				new ActivationKey(
					new JSONObject(
					).put(
						"id", 13
					).put(
						"r_accountEntryToActivationKey_accountEntryId", 6
					)))
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByActivationKeyId(11L)
		).thenReturn(
			List.of(_createLicenseKey(11, 21), _createLicenseKey(11, 22))
		);

		Mockito.when(
			_userAccountService.getUserAccount(2L)
		).thenReturn(
			_createUserAccount("user@liferay.com", "ja_JP")
		);

		_testSubscriptionEntryService.itemsFunction = filterString -> {
			if (filterString.contains("classPK eq 11") ||
				filterString.contains("classPK eq 12")) {

				return List.of(_createSubscriptionEntryJSONObject(1, 2));
			}

			return Collections.emptyList();
		};

		_testSubscriptionEntryService.scheduledSendExpiringLicenseKeyEmails();

		Mockito.verify(
			_licenseKeyService
		).getLicenseKeysByActivationKeyId(
			12L
		);

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).getLicenseKeysByActivationKeyId(
			13L
		);

		ArgumentCaptor<Map<String, String>> placeholdersArgumentCaptor =
			ArgumentCaptor.forClass(Map.class);

		Mockito.verify(
			_notificationTemplateService
		).getAndProcessTemplateJSONObject(
			ArgumentMatchers.eq("LICENSE-KEY-EXPIRATION-WARNING"),
			ArgumentMatchers.eq("ja_JP"), placeholdersArgumentCaptor.capture()
		);

		Map<String, String> placeholders =
			placeholdersArgumentCaptor.getValue();

		Assertions.assertEquals(
			"expiration-status-future", placeholders.get("EXPIRATION_STATUS"));
		Assertions.assertEquals(
			"License 21", placeholders.get("LICENSE_KEY_LICENSE_NAME"));

		Mockito.verify(
			_notificationQueueEntryService
		).addNotificationQueueEntry(
			"customer-service@liferay.com", "Liferay Support",
			"user@liferay.com", "Subject", "Body"
		);
	}

	@Test
	public void testScheduledSendExpiringLicenseKeyEmailsSendsLicenseKeyEmails()
		throws Exception {

		Mockito.when(
			_licenseKeyService.getLicenseKeys(ArgumentMatchers.anyString())
		).thenReturn(
			Collections.emptyList(), Collections.emptyList(),
			List.of(
				_createLicenseKey(0, 31), _createLicenseKey(7, 32),
				_createLicenseKey(0, 33, 6))
		);

		Mockito.when(
			_userAccountService.getUserAccount(2L)
		).thenReturn(
			_createUserAccount("user2@liferay.com", "xx_XX")
		);

		Mockito.when(
			_userAccountService.getUserAccount(3L)
		).thenReturn(
			null
		);

		Mockito.when(
			_userAccountService.getUserAccount(4L)
		).thenReturn(
			_createUserAccount("", "en_US")
		);

		Mockito.when(
			_userAccountService.getUserAccount(5L)
		).thenReturn(
			_createUserAccount("user5@liferay.com", "es_ES")
		);

		_testSubscriptionEntryService.itemsFunction = filterString -> {
			if (filterString.contains("classPK eq 31")) {
				return List.of(
					_createSubscriptionEntryJSONObject(1, 2),
					_createSubscriptionEntryJSONObject(2, 3),
					_createSubscriptionEntryJSONObject(3, 4),
					_createSubscriptionEntryJSONObject(4, 5));
			}

			return Collections.emptyList();
		};

		_testSubscriptionEntryService.scheduledSendExpiringLicenseKeyEmails();

		Assertions.assertFalse(
			_testSubscriptionEntryService.filterStrings.contains(
				"(className eq '" + ClassNameConstants.LICENSE_KEY +
					"') and (classPK eq 32)"));
		Assertions.assertFalse(
			_testSubscriptionEntryService.filterStrings.contains(
				"(className eq '" + ClassNameConstants.LICENSE_KEY +
					"') and (classPK eq 33)"));

		ArgumentCaptor<String> languageIdArgumentCaptor =
			ArgumentCaptor.forClass(String.class);
		ArgumentCaptor<Map<String, String>> placeholdersArgumentCaptor =
			ArgumentCaptor.forClass(Map.class);

		Mockito.verify(
			_notificationTemplateService, Mockito.times(2)
		).getAndProcessTemplateJSONObject(
			ArgumentMatchers.eq("LICENSE-KEY-EXPIRATION-WARNING"),
			languageIdArgumentCaptor.capture(),
			placeholdersArgumentCaptor.capture()
		);

		Assertions.assertEquals(
			List.of("en_US", "es_ES"), languageIdArgumentCaptor.getAllValues());

		Map<String, String> placeholders =
			placeholdersArgumentCaptor.getAllValues(
			).get(
				0
			);

		Assertions.assertEquals(
			"expiration-status-today", placeholders.get("EXPIRATION_STATUS"));
		Assertions.assertEquals(
			"expiration-message-today",
			placeholders.get("LICENSE_KEY_EXPIRATION_MESSAGE"));
		Assertions.assertEquals("Given", placeholders.get("USER_FIRST_NAME"));

		Mockito.verify(
			_notificationQueueEntryService
		).addNotificationQueueEntry(
			"customer-service@liferay.com", "Liferay Support",
			"user2@liferay.com", "Subject", "Body"
		);

		Mockito.verify(
			_notificationQueueEntryService
		).addNotificationQueueEntry(
			"customer-service@liferay.com", "Liferay Support",
			"user5@liferay.com", "Subject", "Body"
		);
	}

	private LicenseKey _createLicenseKey(long activationKeyId, long id) {
		return _createLicenseKey(activationKeyId, id, 5);
	}

	private LicenseKey _createLicenseKey(
		long activationKeyId, long id, long accountEntryId) {

		return new LicenseKey(
			new JSONObject(
			).put(
				"customExpirationDate", "2026-11-04T00:00:00Z"
			).put(
				"id", id
			).put(
				"licenseName", "License " + id
			).put(
				"productName", "DXP"
			).put(
				"r_accountEntryToLicenseKey_accountEntryId", accountEntryId
			).put(
				"r_activationKeyToLicenseKey_c_activationKeyId", activationKeyId
			));
	}

	private JSONObject _createSubscriptionEntryJSONObject(
		long id, long userId) {

		return new JSONObject(
		).put(
			"className", "Class"
		).put(
			"classPK", 1
		).put(
			"customUserId", userId
		).put(
			"id", id
		);
	}

	private UserAccount _createUserAccount(
		String emailAddress, String languageId) {

		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(emailAddress);
		userAccount.setGivenName("Given");
		userAccount.setLanguageId(languageId);

		return userAccount;
	}

	private long _toDays(Date date, long now) {
		return Math.round(
			(double)(date.getTime() - now) / TimeUnit.DAYS.toMillis(1));
	}

	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final ActivationKeyService _activationKeyService = Mockito.mock(
		ActivationKeyService.class);
	private final LicenseKeyService _licenseKeyService = Mockito.mock(
		LicenseKeyService.class);
	private final MessageSource _messageSource = Mockito.mock(
		MessageSource.class);
	private final NotificationQueueEntryService _notificationQueueEntryService =
		Mockito.mock(NotificationQueueEntryService.class);
	private final NotificationTemplateService _notificationTemplateService =
		Mockito.mock(NotificationTemplateService.class);
	private final TestSubscriptionEntryService _testSubscriptionEntryService =
		new TestSubscriptionEntryService();
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);

	private static class TestSubscriptionEntryService
		extends SubscriptionEntryService {

		public final List<String> bodies = new ArrayList<>();
		public final List<String> filterStrings = new ArrayList<>();
		public Function<String, List<JSONObject>> itemsFunction =
			filterString -> Collections.emptyList();
		public String postResponse;
		public final List<String> requests = new ArrayList<>();

		@Override
		protected String delete(String authorization, String body, URI uri) {
			requests.add("DELETE " + uri.getPath());

			return null;
		}

		@Override
		protected <T> List<T> getAllItems(
			String path, String filterString, Function<JSONObject, T> function,
			Jwt jwt) {

			filterStrings.add(filterString);

			List<T> items = new ArrayList<>();

			for (JSONObject jsonObject : itemsFunction.apply(filterString)) {
				items.add(function.apply(jsonObject));
			}

			return items;
		}

		@Override
		protected String getAuthorization() {
			return "Bearer test";
		}

		@Override
		protected String post(String authorization, String body, URI uri) {
			bodies.add(body);
			requests.add("POST " + uri.getPath());

			return postResponse;
		}

	}

}