/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import java.net.URI;

import java.util.concurrent.atomic.AtomicInteger;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * @author Drew Brokke
 */
public class JiraAssetPersistenceTest {

	@Test
	public void testDeleteObjectDoesNotRetryClientErrors() {
		TestJiraAssetPersistence testJiraAssetPersistence =
			new TestJiraAssetPersistence(
				1, _createWebClientResponseException(400));

		Assertions.assertThrows(
			WebClientResponseException.class,
			() -> testJiraAssetPersistence.deleteObject("test-object-id"));

		Assertions.assertEquals(1, testJiraAssetPersistence.getDeleteCount());
	}

	@Test
	public void testDeleteObjectRethrowsAfterExhaustingRetries() {
		WebClientResponseException webClientResponseException1 =
			_createWebClientResponseException(500);

		TestJiraAssetPersistence testJiraAssetPersistence =
			new TestJiraAssetPersistence(
				Integer.MAX_VALUE, webClientResponseException1);

		WebClientResponseException webClientResponseException2 =
			Assertions.assertThrows(
				WebClientResponseException.class,
				() -> testJiraAssetPersistence.deleteObject("test-object-id"));

		Assertions.assertSame(
			webClientResponseException1, webClientResponseException2);

		Assertions.assertEquals(4, testJiraAssetPersistence.getDeleteCount());
	}

	@Test
	public void testDeleteObjectRetriesServerErrors() {
		TestJiraAssetPersistence testJiraAssetPersistence =
			new TestJiraAssetPersistence(
				1, _createWebClientResponseException(500));

		JSONObject jsonObject = testJiraAssetPersistence.deleteObject(
			"test-object-id");

		Assertions.assertTrue(jsonObject.isEmpty());

		Assertions.assertEquals(2, testJiraAssetPersistence.getDeleteCount());
	}

	@Test
	public void testDeleteObjectRetriesTooManyRequests() {
		TestJiraAssetPersistence testJiraAssetPersistence =
			new TestJiraAssetPersistence(
				1, _createWebClientResponseException(429));

		JSONObject jsonObject = testJiraAssetPersistence.deleteObject(
			"test-object-id");

		Assertions.assertTrue(jsonObject.isEmpty());

		Assertions.assertEquals(2, testJiraAssetPersistence.getDeleteCount());
	}

	@Test
	public void testDeleteObjectTreatsMissingObjectAsSuccess() {
		TestJiraAssetPersistence testJiraAssetPersistence =
			new TestJiraAssetPersistence(
				2, _createWebClientResponseException(404));

		JSONObject jsonObject = testJiraAssetPersistence.deleteObject(
			"test-object-id");

		Assertions.assertTrue(jsonObject.isEmpty());

		Assertions.assertEquals(1, testJiraAssetPersistence.getDeleteCount());
	}

	private WebClientResponseException _createWebClientResponseException(
		int statusCode) {

		return WebClientResponseException.create(
			statusCode, "Test Reason", HttpHeaders.EMPTY, new byte[0], null);
	}

	private static class TestJiraAssetPersistence extends JiraAssetPersistence {

		public TestJiraAssetPersistence(
			int failureCount,
			WebClientResponseException webClientResponseException) {

			_failureCount = failureCount;
			_webClientResponseException = webClientResponseException;
		}

		public int getDeleteCount() {
			return _deleteCount.get();
		}

		@Override
		protected String delete(String authorization, String body, URI uri) {
			if (_deleteCount.getAndIncrement() < _failureCount) {
				throw _webClientResponseException;
			}

			return "{}";
		}

		private final AtomicInteger _deleteCount = new AtomicInteger();
		private final int _failureCount;
		private final WebClientResponseException _webClientResponseException;

	}

}