/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import java.net.URI;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * @author Felipe Franca
 */
public class CommerceChannelServiceTest {

	@Test
	public void testFetchChannelIdReturnsId() throws Exception {
		TestCommerceChannelService testCommerceChannelService =
			new TestCommerceChannelService();

		testCommerceChannelService.response = new JSONObject(
		).put(
			"id", _CHANNEL_ID
		).toString();

		Assertions.assertEquals(
			_CHANNEL_ID,
			testCommerceChannelService.fetchChannelId(
				_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testFetchChannelIdThrowsWhenChannelMissing() {
		TestCommerceChannelService testCommerceChannelService =
			new TestCommerceChannelService();

		testCommerceChannelService.webClientResponseException =
			new WebClientResponseException(404, "Not Found", null, null, null);

		Exception exception = Assertions.assertThrows(
			Exception.class,
			() -> testCommerceChannelService.fetchChannelId(
				_EXTERNAL_REFERENCE_CODE));

		Assertions.assertEquals(
			"Unable to find commerce channel " + _EXTERNAL_REFERENCE_CODE,
			exception.getMessage());
	}

	@Test
	public void testFetchChannelIdThrowsWhenResponseIsBlank() {
		TestCommerceChannelService testCommerceChannelService =
			new TestCommerceChannelService();

		Exception exception = Assertions.assertThrows(
			Exception.class,
			() -> testCommerceChannelService.fetchChannelId(
				_EXTERNAL_REFERENCE_CODE));

		Assertions.assertEquals(
			"Unable to find commerce channel " + _EXTERNAL_REFERENCE_CODE,
			exception.getMessage());
	}

	private static final long _CHANNEL_ID = 2000L;

	private static final String _EXTERNAL_REFERENCE_CODE =
		"LIFERAY_ONE_CHANNEL";

	private static class TestCommerceChannelService
		extends CommerceChannelService {

		public String response;
		public WebClientResponseException webClientResponseException;

		@Override
		protected String get(String authorization, URI uri) {
			if (webClientResponseException != null) {
				throw webClientResponseException;
			}

			return response;
		}

		@Override
		protected String getAuthorization() {
			return "Bearer test";
		}

	}

}