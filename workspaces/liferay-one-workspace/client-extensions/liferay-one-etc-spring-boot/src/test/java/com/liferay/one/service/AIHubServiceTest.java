/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;

import java.net.URI;

import java.nio.charset.StandardCharsets;

import java.time.Duration;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.json.JSONObject;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import reactor.core.Disposable;
import reactor.core.Disposables;
import reactor.core.Exceptions;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Scheduler;
import reactor.core.scheduler.Schedulers;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-AIHUBSERVICE] AIHubService")
public class AIHubServiceTest {

	@BeforeEach
	public void setUp() {
		_testAIHubService = new TestAIHubService();

		Mockito.when(
			_liferayOAuth2AccessTokenManager.getAuthorization("external-ai-hub")
		).thenReturn(
			"Bearer external"
		);

		ReflectionTestUtils.setField(
			_testAIHubService, "_externalAIHubHomePageURL", _AI_HUB_URL);
		ReflectionTestUtils.setField(
			_testAIHubService, "_liferayOAuth2AccessTokenManager",
			_liferayOAuth2AccessTokenManager);

		Schedulers.setFactory(
			new Schedulers.Factory() {

				@Override
				public Scheduler newParallel(
					int parallelism, ThreadFactory threadFactory) {

					return new ImmediateScheduler();
				}

			});
	}

	@AfterEach
	public void tearDown() {
		Schedulers.resetFactory();
	}

	@Test
	public void testGetAIHubApplicationJSONObjectReturnsNullOnException() {
		_testAIHubService.runtimeException = new IllegalStateException();

		Assertions.assertNull(
			_testAIHubService.getAIHubApplicationJSONObject("AIHUB-1"));
	}

	@Test
	public void testGetAIHubApplicationJSONObjectReturnsResponse() {
		_testAIHubService.response = "{\"id\": 7}";

		JSONObject jsonObject = _testAIHubService.getAIHubApplicationJSONObject(
			"AIHUB-1");

		Assertions.assertEquals(7, jsonObject.getInt("id"));
	}

	@Test
	public void testProvisionPostsToAIHub() {
		_testAIHubService.response = "{\"status\": \"provisioned\"}";

		JSONObject jsonObject = _testAIHubService.provision(
			new JSONObject(
			).put(
				"accountId", 5
			));

		Assertions.assertEquals("provisioned", jsonObject.getString("status"));

		Assertions.assertEquals(
			List.of("Bearer external"), _testAIHubService.authorizations);
		Assertions.assertEquals(
			URI.create(_AI_HUB_URL + "/o/ai-hub/v1.0/provisioning"),
			_testAIHubService.uris.get(0));
	}

	@Test
	public void testProvisionReturnsNullOnWebClientResponseException() {
		_testAIHubService.runtimeException = WebClientResponseException.create(
			503, "Service Unavailable", HttpHeaders.EMPTY,
			"unavailable".getBytes(StandardCharsets.UTF_8),
			StandardCharsets.UTF_8);

		Assertions.assertNull(_testAIHubService.provision(new JSONObject()));
	}

	@Test
	public void testPurchaseQuotaPrepaidBlockPostsToAccount() {
		_testAIHubService.response = "{}";

		_testAIHubService.purchaseQuotaPrepaidBlock(5, new JSONObject());

		Assertions.assertEquals(
			URI.create(
				_AI_HUB_URL +
					"/o/ai-hub-pricing/v1.0/accounts/5/quota-blocks/purchase"),
			_testAIHubService.uris.get(0));
	}

	@Test
	public void testPurchaseQuotaPrepaidBlockThrowsWithoutResponse() {
		Assertions.assertThrows(
			IllegalStateException.class,
			() -> _testAIHubService.purchaseQuotaPrepaidBlock(
				5, new JSONObject()));
	}

	@Test
	public void testPutAIHubApplicationReturnsNullOnException() {
		_testAIHubService.runtimeException = new IllegalStateException();

		Assertions.assertNull(
			_testAIHubService.putAIHubApplication("AIHUB-1", new JSONObject()));
	}

	@Test
	public void testPutAIHubEnvironmentAddsAIHubURL() {
		_testAIHubService.response = "{\"id\": 9}";

		JSONObject jsonObject = _testAIHubService.putAIHubEnvironment(
			"ENV-1", new JSONObject());

		Assertions.assertEquals(9, jsonObject.getInt("id"));

		JSONObject bodyJSONObject = new JSONObject(
			_testAIHubService.bodies.get(0));

		Assertions.assertEquals(
			_AI_HUB_URL, bodyJSONObject.getString("aiHubURL"));
	}

	@Test
	public void testPutAIHubEnvironmentReturnsNullOnException() {
		_testAIHubService.runtimeException = new IllegalStateException();

		Assertions.assertNull(
			_testAIHubService.putAIHubEnvironment("ENV-1", new JSONObject()));
	}

	@Test
	public void testWebClientExchangeFilterFunctionGivesUpAfterThreeRetries() {
		AtomicInteger attempts = new AtomicInteger();

		Mono<ClientResponse> mono = _filter(
			clientRequest -> Mono.defer(
				() -> {
					attempts.incrementAndGet();

					return Mono.error(new IllegalStateException());
				}));

		RuntimeException runtimeException = Assertions.assertThrows(
			RuntimeException.class, () -> mono.block(Duration.ofSeconds(5)));

		Assertions.assertTrue(Exceptions.isRetryExhausted(runtimeException));

		Assertions.assertEquals(4, attempts.get());
	}

	@Test
	public void testWebClientExchangeFilterFunctionRetriesTransientFailures() {
		AtomicInteger attempts = new AtomicInteger();
		ClientResponse clientResponse = Mockito.mock(ClientResponse.class);

		Mono<ClientResponse> mono = _filter(
			clientRequest -> Mono.defer(
				() -> {
					if (attempts.incrementAndGet() < 3) {
						return Mono.error(new IllegalStateException());
					}

					return Mono.just(clientResponse);
				}));

		Assertions.assertSame(
			clientResponse, mono.block(Duration.ofSeconds(5)));

		Assertions.assertEquals(3, attempts.get());
	}

	private Mono<ClientResponse> _filter(ExchangeFunction exchangeFunction) {
		ExchangeFilterFunction exchangeFilterFunction =
			_testAIHubService.getWebClientExchangeFilterFunction();

		return exchangeFilterFunction.filter(
			ClientRequest.create(
				HttpMethod.GET, URI.create(_AI_HUB_URL + "/o/ai-hub/v1.0")
			).build(),
			exchangeFunction);
	}

	private static final String _AI_HUB_URL = "https://aihub.example.com";

	private final LiferayOAuth2AccessTokenManager
		_liferayOAuth2AccessTokenManager = Mockito.mock(
			LiferayOAuth2AccessTokenManager.class);
	private TestAIHubService _testAIHubService;

	private static class ImmediateScheduler implements Scheduler {

		@Override
		public Worker createWorker() {
			return new ImmediateWorker();
		}

		@Override
		public Disposable schedule(Runnable task) {
			task.run();

			return Disposables.disposed();
		}

		@Override
		public Disposable schedule(Runnable task, long delay, TimeUnit unit) {
			return schedule(task);
		}

	}

	private static class ImmediateWorker implements Scheduler.Worker {

		@Override
		public void dispose() {
			_disposed = true;
		}

		@Override
		public boolean isDisposed() {
			return _disposed;
		}

		@Override
		public Disposable schedule(Runnable task) {
			task.run();

			return Disposables.disposed();
		}

		@Override
		public Disposable schedule(Runnable task, long delay, TimeUnit unit) {
			return schedule(task);
		}

		private boolean _disposed;

	}

	private static class TestAIHubService extends AIHubService {

		public final List<String> authorizations = new ArrayList<>();
		public final List<String> bodies = new ArrayList<>();
		public String response;
		public RuntimeException runtimeException;
		public final List<URI> uris = new ArrayList<>();

		@Override
		protected String get(String authorization, URI uri) {
			return _respond(authorization, null, uri);
		}

		@Override
		protected String getAuthorization() {
			return "Bearer test";
		}

		@Override
		protected String post(String authorization, String body, URI uri) {
			return _respond(authorization, body, uri);
		}

		@Override
		protected String put(String authorization, String body, URI uri) {
			return _respond(authorization, body, uri);
		}

		private String _respond(String authorization, String body, URI uri) {
			authorizations.add(authorization);
			bodies.add(body);
			uris.add(uri);

			if (runtimeException != null) {
				throw runtimeException;
			}

			return response;
		}

	}

}