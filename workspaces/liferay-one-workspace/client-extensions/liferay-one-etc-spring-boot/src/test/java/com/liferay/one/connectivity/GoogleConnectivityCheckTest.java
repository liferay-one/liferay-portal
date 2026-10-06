/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.connectivity;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.IdToken;

import com.liferay.petra.string.StringBundler;

import java.nio.charset.StandardCharsets;

import java.time.Instant;

import java.util.Base64;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.MockedStatic;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Allen Ziegenfus
 */
public class GoogleConnectivityCheckTest {

	@BeforeEach
	public void setUp() {
		_googleConnectivityCheck = new GoogleConnectivityCheck();

		ReflectionTestUtils.setField(
			_googleConnectivityCheck, "_enabled", true);
	}

	@Test
	public void testCheckOnStartupIsSkippedWhenDisabled() {
		ReflectionTestUtils.setField(
			_googleConnectivityCheck, "_enabled", false);

		try (MockedStatic<GoogleCredentials> mockedStatic = Mockito.mockStatic(
				GoogleCredentials.class)) {

			_googleConnectivityCheck.checkOnStartup();

			mockedStatic.verify(
				GoogleCredentials::getApplicationDefault, Mockito.never());
		}
	}

	@Test
	public void testGetIdTokenDescriptionReportsTheClaims() throws Exception {
		Instant instant = Instant.ofEpochSecond(1800000000);

		String description = ReflectionTestUtils.invokeMethod(
			_googleConnectivityCheck, "_getIdTokenDescription",
			IdToken.create(_createIdTokenValue(instant.getEpochSecond())));

		Assertions.assertEquals(
			StringBundler.concat(
				"minted an ID token for ", _SERVICE_ACCOUNT,
				" issued by https://accounts.google.com expiring at ", instant),
			description);
	}

	private String _createIdTokenValue(long exp) {
		Base64.Encoder encoder = Base64.getUrlEncoder(
		).withoutPadding();

		String header = encoder.encodeToString(
			"{\"alg\": \"RS256\", \"typ\": \"JWT\"}".getBytes(
				StandardCharsets.UTF_8));

		String payload = encoder.encodeToString(
			StringBundler.concat(
				"{\"aud\": \"", _AUDIENCE, "\", \"email\": \"",
				_SERVICE_ACCOUNT, "\", \"exp\": ", exp,
				", \"iss\": \"https://accounts.google.com\"}"
			).getBytes(
				StandardCharsets.UTF_8
			));

		String signature = encoder.encodeToString(
			"signature".getBytes(StandardCharsets.UTF_8));

		return StringBundler.concat(header, ".", payload, ".", signature);
	}

	private static final String _AUDIENCE =
		"https://ldp-usage-metrics-api.example.run.app";

	private static final String _SERVICE_ACCOUNT =
		"one-liferay-api-consumer@liferay-dw-infra-uat.iam.gserviceaccount.com";

	private GoogleConnectivityCheck _googleConnectivityCheck;

}