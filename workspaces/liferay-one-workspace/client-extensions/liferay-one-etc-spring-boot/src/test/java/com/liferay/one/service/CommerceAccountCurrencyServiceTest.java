/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountContactInformation;
import com.liferay.headless.admin.user.client.dto.v1_0.PostalAddress;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Currency;
import com.liferay.headless.commerce.admin.channel.client.dto.v1_0.Channel;

import java.net.URI;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.List;
import java.util.function.Function;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * @author Felipe Franca
 */
public class CommerceAccountCurrencyServiceTest {

	@BeforeEach
	public void setUp() {
		_commerceAccountCurrencyService = new CommerceAccountCurrencyService();
	}

	@Test
	public void testAssignDefaultCurrencyResolvesCountryFromAccountContactInformation()
		throws Exception {

		CommerceAccountCurrencyService commerceAccountCurrencyService =
			Mockito.spy(new CommerceAccountCurrencyService());

		Account account = new Account();

		account.setExternalReferenceCode("ACC-404");

		AccountContactInformation accountContactInformation =
			new AccountContactInformation();

		PostalAddress postalAddress = new PostalAddress();

		postalAddress.setAddressCountry(() -> "Brazil");
		postalAddress.setAddressType("Billing and Shipping");

		accountContactInformation.setPostalAddresses(
			() -> new PostalAddress[] {postalAddress});

		account.setAccountContactInformation(accountContactInformation);

		Mockito.doNothing(
		).when(
			commerceAccountCurrencyService
		).upsertAccountCurrency(
			"ACC-404", "USD"
		);

		commerceAccountCurrencyService.assignDefaultCurrency(account);

		Mockito.verify(
			commerceAccountCurrencyService
		).upsertAccountCurrency(
			"ACC-404", "USD"
		);
	}

	@Test
	public void testAssignDefaultCurrencyResolvesCountryFromPostalAddress()
		throws Exception {

		CommerceAccountCurrencyService commerceAccountCurrencyService =
			Mockito.spy(new CommerceAccountCurrencyService());

		PostalAddressService postalAddressService = Mockito.mock(
			PostalAddressService.class);

		ReflectionTestUtils.setField(
			commerceAccountCurrencyService, "_postalAddressService",
			postalAddressService);

		Account account = new Account();

		account.setDefaultBillingAddressId(101L);
		account.setExternalReferenceCode("ACC-101");

		PostalAddress postalAddress = new PostalAddress();

		postalAddress.setAddressCountry(() -> "United Kingdom");

		Mockito.doReturn(
			postalAddress
		).when(
			postalAddressService
		).getPostalAddress(
			101L
		);

		Mockito.doNothing(
		).when(
			commerceAccountCurrencyService
		).upsertAccountCurrency(
			"ACC-101", "GBP"
		);

		commerceAccountCurrencyService.assignDefaultCurrency(account);

		Mockito.verify(
			commerceAccountCurrencyService
		).upsertAccountCurrency(
			"ACC-101", "GBP"
		);
	}

	@Test
	public void testAssignDefaultCurrencySkipsWhenCountryUnmapped()
		throws Exception {

		CommerceAccountCurrencyService commerceAccountCurrencyService =
			Mockito.spy(new CommerceAccountCurrencyService());

		Account account = new Account();

		account.setExternalReferenceCode("ACC-303");

		commerceAccountCurrencyService.assignDefaultCurrency(
			account, "Atlantis");

		Mockito.verify(
			commerceAccountCurrencyService, Mockito.never()
		).upsertAccountCurrency(
			ArgumentMatchers.anyString(), ArgumentMatchers.anyString()
		);
	}

	@Test
	public void testAssignDefaultCurrencyWithExplicitCountry()
		throws Exception {

		CommerceAccountCurrencyService commerceAccountCurrencyService =
			Mockito.spy(new CommerceAccountCurrencyService());

		Account account = new Account();

		account.setExternalReferenceCode("ACC-202");

		Mockito.doNothing(
		).when(
			commerceAccountCurrencyService
		).upsertAccountCurrency(
			"ACC-202", "AUD"
		);

		commerceAccountCurrencyService.assignDefaultCurrency(
			account, "Australia");

		Mockito.verify(
			commerceAccountCurrencyService
		).upsertAccountCurrency(
			"ACC-202", "AUD"
		);
	}

	@Test
	public void testUpsertAccountChannelCurrencyEvictsChannelIdWhenPostConflicts() {
		TestCommerceAccountCurrencyService testCommerceAccountCurrencyService =
			new TestCommerceAccountCurrencyService();

		testCommerceAccountCurrencyService.postWebClientResponseException =
			new WebClientResponseException(409, "Conflict", null, null, null);

		Assertions.assertThrows(
			Exception.class,
			() -> ReflectionTestUtils.invokeMethod(
				testCommerceAccountCurrencyService,
				"_upsertAccountChannelCurrency", "SF-1", _CURRENCY_ID));

		Assertions.assertEquals(
			1,
			testCommerceAccountCurrencyService.commerceChannelService.
				evictCount);
		Assertions.assertTrue(
			testCommerceAccountCurrencyService.patchURIs.isEmpty());
	}

	@Test
	public void testUpsertAccountChannelCurrencyIgnoresEntryOnDifferentChannel()
		throws Exception {

		TestCommerceAccountCurrencyService testCommerceAccountCurrencyService =
			new TestCommerceAccountCurrencyService();

		JSONObject jsonObject = _createEntryJSONObject(_CURRENCY_ID);

		jsonObject.put("channelId", _CHANNEL_ID + 1);

		testCommerceAccountCurrencyService.getAllItemsResults.add(
			Collections.singletonList(jsonObject));

		ReflectionTestUtils.invokeMethod(
			testCommerceAccountCurrencyService, "_upsertAccountChannelCurrency",
			"SF-1", _CURRENCY_ID);

		Assertions.assertTrue(
			testCommerceAccountCurrencyService.patchURIs.isEmpty());
		Assertions.assertEquals(
			1, testCommerceAccountCurrencyService.postURIs.size());

		URI postURI = testCommerceAccountCurrencyService.postURIs.get(0);

		Assertions.assertEquals(
			"/o/headless-commerce-admin-account/v1.0/accounts" +
				"/by-externalReferenceCode/SF-1/account-channel-currencies",
			postURI.getPath());

		JSONObject postBodyJSONObject = new JSONObject(
			testCommerceAccountCurrencyService.postBodies.get(0));

		Assertions.assertEquals(
			_CHANNEL_EXTERNAL_REFERENCE_CODE,
			postBodyJSONObject.getString("channelExternalReferenceCode"));
		Assertions.assertEquals(
			_CURRENCY_ID, postBodyJSONObject.getLong("classPK"));
	}

	@Test
	public void testUpsertAccountChannelCurrencyPatchesWhenClassPKDiffers()
		throws Exception {

		TestCommerceAccountCurrencyService testCommerceAccountCurrencyService =
			new TestCommerceAccountCurrencyService();

		testCommerceAccountCurrencyService.getAllItemsResults.add(
			Collections.singletonList(
				_createEntryJSONObject(_CURRENCY_ID + 1)));

		ReflectionTestUtils.invokeMethod(
			testCommerceAccountCurrencyService, "_upsertAccountChannelCurrency",
			"SF-1", _CURRENCY_ID);

		Assertions.assertTrue(
			testCommerceAccountCurrencyService.postURIs.isEmpty());
		Assertions.assertEquals(
			1, testCommerceAccountCurrencyService.patchURIs.size());

		URI patchURI = testCommerceAccountCurrencyService.patchURIs.get(0);

		Assertions.assertEquals(
			"/o/headless-commerce-admin-account/v1.0" +
				"/account-channel-currencies/1",
			patchURI.getPath());

		JSONObject patchBodyJSONObject = new JSONObject(
			testCommerceAccountCurrencyService.patchBodies.get(0));

		Assertions.assertEquals(
			_CURRENCY_ID, patchBodyJSONObject.getLong("classPK"));
	}

	@Test
	public void testUpsertAccountChannelCurrencyPostsWhenNoEntryExists()
		throws Exception {

		TestCommerceAccountCurrencyService testCommerceAccountCurrencyService =
			new TestCommerceAccountCurrencyService();

		ReflectionTestUtils.invokeMethod(
			testCommerceAccountCurrencyService, "_upsertAccountChannelCurrency",
			"SF-1", _CURRENCY_ID);

		Assertions.assertTrue(
			testCommerceAccountCurrencyService.patchURIs.isEmpty());
		Assertions.assertEquals(
			1, testCommerceAccountCurrencyService.postURIs.size());

		URI postURI = testCommerceAccountCurrencyService.postURIs.get(0);

		Assertions.assertEquals(
			"/o/headless-commerce-admin-account/v1.0/accounts" +
				"/by-externalReferenceCode/SF-1/account-channel-currencies",
			postURI.getPath());
	}

	@Test
	public void testUpsertAccountChannelCurrencyRethrowsWithoutEvictingOnError() {
		TestCommerceAccountCurrencyService testCommerceAccountCurrencyService =
			new TestCommerceAccountCurrencyService();

		testCommerceAccountCurrencyService.postWebClientResponseException =
			new WebClientResponseException(500, "Error", null, null, null);

		Assertions.assertThrows(
			Exception.class,
			() -> ReflectionTestUtils.invokeMethod(
				testCommerceAccountCurrencyService,
				"_upsertAccountChannelCurrency", "SF-1", _CURRENCY_ID));

		Assertions.assertEquals(
			0,
			testCommerceAccountCurrencyService.commerceChannelService.
				evictCount);
	}

	@Test
	public void testUpsertAccountChannelCurrencyReturnsWhenClassPKMatches()
		throws Exception {

		TestCommerceAccountCurrencyService testCommerceAccountCurrencyService =
			new TestCommerceAccountCurrencyService();

		testCommerceAccountCurrencyService.getAllItemsResults.add(
			Collections.singletonList(_createEntryJSONObject(_CURRENCY_ID)));

		ReflectionTestUtils.invokeMethod(
			testCommerceAccountCurrencyService, "_upsertAccountChannelCurrency",
			"SF-1", _CURRENCY_ID);

		Assertions.assertTrue(
			testCommerceAccountCurrencyService.patchURIs.isEmpty());
		Assertions.assertTrue(
			testCommerceAccountCurrencyService.postURIs.isEmpty());
	}

	@Test
	public void testUpsertAccountCurrencyDoesNotThrowForBlankCurrency() {
		Assertions.assertDoesNotThrow(
			() -> _commerceAccountCurrencyService.upsertAccountCurrency(
				"SF-1", ""));
	}

	@Test
	public void testUpsertAccountCurrencyDoesNotThrowForNullCurrency() {
		Assertions.assertDoesNotThrow(
			() -> _commerceAccountCurrencyService.upsertAccountCurrency(
				"SF-1", null));
	}

	@Test
	public void testUpsertAccountCurrencyDoesNotThrowForUnsupportedCurrency() {
		Assertions.assertDoesNotThrow(
			() -> _commerceAccountCurrencyService.upsertAccountCurrency(
				"SF-1", "CHF"));
	}

	@Test
	public void testUpsertAccountCurrencyPostsWhenCurrencyIsActive()
		throws Exception {

		TestCommerceAccountCurrencyService testCommerceAccountCurrencyService =
			new TestCommerceAccountCurrencyService();

		testCommerceAccountCurrencyService.commerceCurrencyService.currency =
			_createCurrency(true);

		testCommerceAccountCurrencyService.upsertAccountCurrency("SF-1", "EUR");

		Assertions.assertEquals(
			1, testCommerceAccountCurrencyService.postURIs.size());

		JSONObject postBodyJSONObject = new JSONObject(
			testCommerceAccountCurrencyService.postBodies.get(0));

		Assertions.assertEquals(
			_CURRENCY_ID, postBodyJSONObject.getLong("classPK"));
	}

	@Test
	public void testUpsertAccountCurrencySkipsWhenCurrencyActiveIsNull()
		throws Exception {

		TestCommerceAccountCurrencyService testCommerceAccountCurrencyService =
			new TestCommerceAccountCurrencyService();

		testCommerceAccountCurrencyService.commerceCurrencyService.currency =
			_createCurrency(null);

		testCommerceAccountCurrencyService.upsertAccountCurrency("SF-1", "EUR");

		Assertions.assertTrue(
			testCommerceAccountCurrencyService.patchURIs.isEmpty());
		Assertions.assertTrue(
			testCommerceAccountCurrencyService.postURIs.isEmpty());
	}

	@Test
	public void testUpsertAccountCurrencySkipsWhenCurrencyIsInactive()
		throws Exception {

		TestCommerceAccountCurrencyService testCommerceAccountCurrencyService =
			new TestCommerceAccountCurrencyService();

		testCommerceAccountCurrencyService.commerceCurrencyService.currency =
			_createCurrency(false);

		testCommerceAccountCurrencyService.upsertAccountCurrency("SF-1", "EUR");

		Assertions.assertTrue(
			testCommerceAccountCurrencyService.patchURIs.isEmpty());
		Assertions.assertTrue(
			testCommerceAccountCurrencyService.postURIs.isEmpty());
	}

	@Test
	public void testUpsertAccountCurrencySkipsWhenCurrencyIsMissing()
		throws Exception {

		TestCommerceAccountCurrencyService testCommerceAccountCurrencyService =
			new TestCommerceAccountCurrencyService();

		testCommerceAccountCurrencyService.upsertAccountCurrency("SF-1", "EUR");

		Assertions.assertTrue(
			testCommerceAccountCurrencyService.patchURIs.isEmpty());
		Assertions.assertTrue(
			testCommerceAccountCurrencyService.postURIs.isEmpty());
	}

	private Currency _createCurrency(Boolean active) {
		Currency currency = new Currency();

		currency.setActive(active);
		currency.setId(_CURRENCY_ID);

		return currency;
	}

	private JSONObject _createEntryJSONObject(long classPK) {
		return new JSONObject(
		).put(
			"channelId", _CHANNEL_ID
		).put(
			"classPK", classPK
		).put(
			"id", 1L
		);
	}

	private static final String _CHANNEL_EXTERNAL_REFERENCE_CODE =
		"LIFERAY_ONE_CHANNEL";

	private static final long _CHANNEL_ID = 2000L;

	private static final long _CURRENCY_ID = 1000L;

	private CommerceAccountCurrencyService _commerceAccountCurrencyService;

	private static class TestCommerceAccountCurrencyService
		extends CommerceAccountCurrencyService {

		public TestCommerceAccountCurrencyService() {
			ReflectionTestUtils.setField(
				this, "_commerceChannelExternalReferenceCode",
				_CHANNEL_EXTERNAL_REFERENCE_CODE);
			ReflectionTestUtils.setField(
				this, "_commerceChannelService", commerceChannelService);
			ReflectionTestUtils.setField(
				this, "_commerceCurrencyService", commerceCurrencyService);
		}

		public final TestCommerceChannelService commerceChannelService =
			new TestCommerceChannelService();
		public final TestCommerceCurrencyService commerceCurrencyService =
			new TestCommerceCurrencyService();
		public final Deque<List<JSONObject>> getAllItemsResults =
			new ArrayDeque<>();
		public final List<String> patchBodies = new ArrayList<>();
		public final List<URI> patchURIs = new ArrayList<>();
		public final List<String> postBodies = new ArrayList<>();
		public final List<URI> postURIs = new ArrayList<>();
		public WebClientResponseException postWebClientResponseException;

		@Override
		protected <T> List<T> getAllItems(
				String path, String filterString,
				Function<JSONObject, T> function)
			throws Exception {

			List<JSONObject> jsonObjects = getAllItemsResults.poll();

			List<T> items = new ArrayList<>();

			if (jsonObjects == null) {
				return items;
			}

			for (JSONObject jsonObject : jsonObjects) {
				items.add(function.apply(jsonObject));
			}

			return items;
		}

		@Override
		protected String getAuthorization() {
			return "Bearer test";
		}

		@Override
		protected String patch(String authorization, String body, URI uri) {
			patchBodies.add(body);
			patchURIs.add(uri);

			return "{}";
		}

		@Override
		protected String post(String authorization, String body, URI uri) {
			postBodies.add(body);
			postURIs.add(uri);

			if (postWebClientResponseException != null) {
				throw postWebClientResponseException;
			}

			return "{}";
		}

	}

	private static class TestCommerceChannelService
		extends CommerceChannelService {

		@Override
		public void evictChannel(String externalReferenceCode) {
			evictCount++;
		}

		@Override
		public Channel fetchChannel(String externalReferenceCode) {
			Channel channel = new Channel();

			channel.setId(_CHANNEL_ID);

			return channel;
		}

		public int evictCount;

	}

	private static class TestCommerceCurrencyService
		extends CommerceCurrencyService {

		@Override
		public Currency fetchCurrency(String currencyIsoCode) {
			return currency;
		}

		public Currency currency;

	}

}