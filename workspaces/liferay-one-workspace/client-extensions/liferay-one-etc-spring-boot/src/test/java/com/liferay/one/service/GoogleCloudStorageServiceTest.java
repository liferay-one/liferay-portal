/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.exception.FileServerUnavailableException;

import com.sun.net.httpserver.HttpServer;

import java.io.OutputStream;

import java.net.InetSocketAddress;
import java.net.URI;

import java.nio.charset.StandardCharsets;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.MockedStatic;
import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Mono;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-GOOGLECLOUDSTORAGESERVICE] GoogleCloudStorageService")
public class GoogleCloudStorageServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_httpServer = HttpServer.create(new InetSocketAddress(0), 0);

		_httpServer.createContext(
			"/token",
			httpExchange -> {
				byte[] bytes = new JSONObject(
				).put(
					"access_token", "gcs-token"
				).put(
					"expires_in", 3600
				).put(
					"token_type", "Bearer"
				).toString(
				).getBytes(
					StandardCharsets.UTF_8
				);

				httpExchange.getResponseHeaders(
				).add(
					"Content-Type", "application/json"
				);

				httpExchange.sendResponseHeaders(200, bytes.length);

				try (OutputStream outputStream =
						httpExchange.getResponseBody()) {

					outputStream.write(bytes);
				}
			});

		_httpServer.start();

		ReflectionTestUtils.setField(
			_testGoogleCloudStorageService, "_gcsServiceAccountKey",
			_createServiceAccountKey());
	}

	@AfterEach
	public void tearDown() {
		_httpServer.stop(0);
	}

	@Test
	public void testDeleteObject() throws Exception {
		_testGoogleCloudStorageService.deleteObject("bucket-1", "folder/a b");

		Assertions.assertEquals(
			"Bearer gcs-token", _testGoogleCloudStorageService._authorization);
		Assertions.assertEquals(
			"https://storage.googleapis.com/storage/v1/b/bucket-1/o" +
				"/folder%2Fa%20b",
			_testGoogleCloudStorageService._uri.toString());
	}

	@Test
	public void testDeleteObjectWrapsFailure() {
		_testGoogleCloudStorageService._runtimeException =
			new IllegalStateException();

		Assertions.assertThrows(
			FileServerUnavailableException.class,
			() -> _testGoogleCloudStorageService.deleteObject(
				"bucket-1", "object-1"));
	}

	@Test
	public void testGetDownloadURLExpiresInFifteenMinutes() throws Exception {
		String downloadURL = _testGoogleCloudStorageService.getDownloadURL(
			"bucket-1", "object-1");

		Assertions.assertTrue(
			downloadURL.startsWith(
				"https://storage.googleapis.com/bucket-1/object-1?"),
			downloadURL);
		Assertions.assertTrue(
			downloadURL.contains("X-Goog-Expires=900"), downloadURL);
		Assertions.assertTrue(
			downloadURL.contains("X-Goog-Signature="), downloadURL);
	}

	@Test
	public void testGetDownloadURLWithInvalidKeyThrows() {
		ReflectionTestUtils.setField(
			_testGoogleCloudStorageService, "_gcsServiceAccountKey", "{}");

		Assertions.assertThrows(
			FileServerUnavailableException.class,
			() -> _testGoogleCloudStorageService.getDownloadURL(
				"bucket-1", "object-1"));
	}

	@Test
	public void testGetUploadSessionURLReturnsLocation() throws Exception {
		List<ClientRequest> clientRequests = new ArrayList<>();

		Assertions.assertEquals(
			"https://upload.example.com/session-1",
			_getUploadSessionURL(
				clientRequests,
				ClientResponse.create(
					HttpStatus.OK
				).header(
					HttpHeaders.LOCATION, "https://upload.example.com/session-1"
				).build()));

		ClientRequest clientRequest = clientRequests.get(0);

		Assertions.assertEquals(
			"https://storage.googleapis.com/upload/storage/v1/b/bucket-1/o" +
				"?name=object-1&uploadType=resumable",
			String.valueOf(clientRequest.url()));

		HttpHeaders httpHeaders = clientRequest.headers();

		Assertions.assertEquals(
			"Bearer gcs-token",
			httpHeaders.getFirst(HttpHeaders.AUTHORIZATION));
		Assertions.assertEquals(
			"1024", httpHeaders.getFirst(HttpHeaders.CONTENT_LENGTH));
		Assertions.assertEquals(
			"https://one.example.com",
			httpHeaders.getFirst(HttpHeaders.ORIGIN));
	}

	@Test
	public void testGetUploadSessionURLWithServerErrorThrows() {
		Assertions.assertThrows(
			FileServerUnavailableException.class,
			() -> _getUploadSessionURL(
				new ArrayList<>(),
				ClientResponse.create(
					HttpStatus.SERVICE_UNAVAILABLE
				).build()));
	}

	@Test
	public void testGetUploadSessionURLWithoutLocationThrows() {
		Assertions.assertThrows(
			FileServerUnavailableException.class,
			() -> _getUploadSessionURL(
				new ArrayList<>(),
				ClientResponse.create(
					HttpStatus.OK
				).build()));
	}

	private String _createServiceAccountKey() throws Exception {
		KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("RSA");

		keyPairGenerator.initialize(2048);

		KeyPair keyPair = keyPairGenerator.generateKeyPair();

		Base64.Encoder encoder = Base64.getMimeEncoder(
			64, "\n".getBytes(StandardCharsets.UTF_8));

		PrivateKey privateKey = keyPair.getPrivate();

		String encodedPrivateKey = encoder.encodeToString(
			privateKey.getEncoded());

		InetSocketAddress inetSocketAddress = _httpServer.getAddress();

		return new JSONObject(
		).put(
			"client_email", "test@project-1.iam.gserviceaccount.com"
		).put(
			"client_id", "1234567890"
		).put(
			"private_key",
			"-----BEGIN PRIVATE KEY-----\n" + encodedPrivateKey +
				"\n-----END PRIVATE KEY-----\n"
		).put(
			"private_key_id", "key-1"
		).put(
			"project_id", "project-1"
		).put(
			"token_uri",
			"http://localhost:" + inetSocketAddress.getPort() + "/token"
		).put(
			"type", "service_account"
		).toString();
	}

	private String _getUploadSessionURL(
			List<ClientRequest> clientRequests, ClientResponse clientResponse)
		throws Exception {

		WebClient.Builder builder = WebClient.builder();

		WebClient webClient = builder.exchangeFunction(
			clientRequest -> {
				clientRequests.add(clientRequest);

				return Mono.just(clientResponse);
			}
		).build();

		try (MockedStatic<WebClient> webClientMockedStatic = Mockito.mockStatic(
				WebClient.class)) {

			webClientMockedStatic.when(
				WebClient::create
			).thenReturn(
				webClient
			);

			return _testGoogleCloudStorageService.getUploadSessionURL(
				"bucket-1", "1024", "object-1", "https://one.example.com");
		}
	}

	private HttpServer _httpServer;
	private final TestGoogleCloudStorageService _testGoogleCloudStorageService =
		new TestGoogleCloudStorageService();

	private static class TestGoogleCloudStorageService
		extends GoogleCloudStorageService {

		@Override
		protected String delete(String authorization, String body, URI uri) {
			_authorization = authorization;
			_uri = uri;

			if (_runtimeException != null) {
				throw _runtimeException;
			}

			return null;
		}

		private String _authorization;
		private RuntimeException _runtimeException;
		private URI _uri;

	}

}