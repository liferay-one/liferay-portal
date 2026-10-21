/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import java.net.http.HttpClient;

import java.time.Duration;

import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;

import reactor.core.publisher.Mono;

import reactor.netty.http.client.HttpClientRequest;

/**
 * Bounds every outbound HTTP call of the sidecar. The read timeout is the
 * longest wait between two reads of one response, so it stops a call that
 * hangs and allows a slow one, such as the creation of a portal instance.
 *
 * @author Ryan Schuhler
 */
public class HTTPTimeoutUtil {

	public static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);

	public static final Duration READ_TIMEOUT = Duration.ofMinutes(5);

	public static ExchangeFilterFunction getExchangeFilterFunction() {
		return ExchangeFilterFunction.ofRequestProcessor(
			clientRequest -> Mono.just(
				ClientRequest.from(
					clientRequest
				).httpRequest(
					clientHttpRequest -> {
						Object nativeRequest =
							clientHttpRequest.getNativeRequest();

						if (nativeRequest instanceof
								HttpClientRequest httpClientRequest) {

							httpClientRequest.responseTimeout(READ_TIMEOUT);
						}
					}
				).build()));
	}

	public static HttpClient newHttpClient() {
		return HttpClient.newBuilder(
		).connectTimeout(
			CONNECT_TIMEOUT
		).build();
	}

	public static void setURLConnectionTimeouts() {
		System.setProperty(
			"sun.net.client.defaultConnectTimeout",
			String.valueOf(CONNECT_TIMEOUT.toMillis()));
		System.setProperty(
			"sun.net.client.defaultReadTimeout",
			String.valueOf(READ_TIMEOUT.toMillis()));
	}

}