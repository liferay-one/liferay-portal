/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.google.auth.oauth2.IdTokenCredentials;
import com.google.auth.oauth2.IdTokenProvider;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Veloso
 */
public class GoogleCloudFunctionServiceTest {

	@BeforeEach
	public void setUp() {
		_googleCloudFunctionService = new GoogleCloudFunctionService();

		ReflectionTestUtils.setField(
			_googleCloudFunctionService, "_idTokenProvider", _idTokenProvider);
	}

	@Test
	public void testGetIdTokenCredentialsCachesOneInstancePerAudience() {
		Assertions.assertSame(
			_getIdTokenCredentials(_AUDIENCE_COMPOSABLE),
			_getIdTokenCredentials(_AUDIENCE_COMPOSABLE));
	}

	@Test
	public void testGetIdTokenCredentialsSeparatesAudiences() {
		Assertions.assertNotSame(
			_getIdTokenCredentials(_AUDIENCE_COMPOSABLE),
			_getIdTokenCredentials(_AUDIENCE_CUSTOMER));
	}

	@Test
	public void testGetIdTokenProviderReusesResolvedProvider() {
		Assertions.assertSame(
			_idTokenProvider,
			ReflectionTestUtils.invokeMethod(
				_googleCloudFunctionService, "_getIdTokenProvider"));
	}

	private IdTokenCredentials _getIdTokenCredentials(String audience) {
		return ReflectionTestUtils.invokeMethod(
			_googleCloudFunctionService, "_getIdTokenCredentials", audience);
	}

	private static final String _AUDIENCE_COMPOSABLE =
		"https://example.com/composable_usage_api";

	private static final String _AUDIENCE_CUSTOMER =
		"https://example.com/customer_usage_api";

	private GoogleCloudFunctionService _googleCloudFunctionService;
	private final IdTokenProvider _idTokenProvider = Mockito.mock(
		IdTokenProvider.class);

}