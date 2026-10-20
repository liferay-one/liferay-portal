/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import java.net.URI;
import java.net.http.HttpClient;

import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.reactive.ClientHttpRequest;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeStrategies;

import reactor.core.publisher.Mono;

import reactor.netty.http.client.HttpClientRequest;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-HTTPTIMEOUTUTIL] HTTPTimeoutUtil")
public class HTTPTimeoutUtilTest {

	@Test
	public void testGetExchangeFilterFunctionSetsResponseTimeout() {
		AtomicReference<ClientRequest> clientRequestAtomicReference =
			new AtomicReference<>();

		HTTPTimeoutUtil.getExchangeFilterFunction(
		).filter(
			ClientRequest.create(
				HttpMethod.GET, URI.create("http://localhost/test")
			).build(),
			clientRequest -> {
				clientRequestAtomicReference.set(clientRequest);

				return Mono.just(Mockito.mock(ClientResponse.class));
			}
		).block();

		ClientHttpRequest clientHttpRequest = Mockito.mock(
			ClientHttpRequest.class);

		HttpClientRequest httpClientRequest = Mockito.mock(
			HttpClientRequest.class);

		Mockito.when(
			clientHttpRequest.getCookies()
		).thenReturn(
			new LinkedMultiValueMap<>()
		);

		Mockito.when(
			clientHttpRequest.getHeaders()
		).thenReturn(
			new HttpHeaders()
		);

		Mockito.when(
			clientHttpRequest.getNativeRequest()
		).thenReturn(
			httpClientRequest
		);

		Mockito.when(
			clientHttpRequest.setComplete()
		).thenReturn(
			Mono.empty()
		);

		ClientRequest clientRequest = clientRequestAtomicReference.get();

		clientRequest.writeTo(
			clientHttpRequest, ExchangeStrategies.withDefaults()
		).block();

		Mockito.verify(
			httpClientRequest
		).responseTimeout(
			HTTPTimeoutUtil.READ_TIMEOUT
		);
	}

	@Test
	public void testNewHttpClientSetsConnectTimeout() {
		HttpClient httpClient = HTTPTimeoutUtil.newHttpClient();

		Assertions.assertEquals(
			HTTPTimeoutUtil.CONNECT_TIMEOUT,
			httpClient.connectTimeout(
			).orElse(
				null
			));
	}

	@Test
	public void testSetURLConnectionTimeouts() {
		HTTPTimeoutUtil.setURLConnectionTimeouts();

		Assertions.assertEquals(
			String.valueOf(HTTPTimeoutUtil.CONNECT_TIMEOUT.toMillis()),
			System.getProperty("sun.net.client.defaultConnectTimeout"));
		Assertions.assertEquals(
			String.valueOf(HTTPTimeoutUtil.READ_TIMEOUT.toMillis()),
			System.getProperty("sun.net.client.defaultReadTimeout"));
	}

}
