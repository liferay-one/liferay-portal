/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ImpersonatedCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageException;
import com.google.cloud.storage.StorageOptions;

import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.one.exception.FileServerUnavailableException;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.Validator;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import java.net.URI;
import java.net.URL;

import java.nio.charset.StandardCharsets;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Amos Fong
 */
@Component
public class GoogleCloudStorageService extends BaseService {

	public void deleteObject(String bucketName, String objectName)
		throws Exception {

		try {
			delete(
				"Bearer " + _getAccessToken(), StringPool.BLANK,
				UriComponentsBuilder.fromUriString(
					_getBaseURL() + "/storage/v1/b/{bucketName}/o/{objectName}"
				).build(
					bucketName, objectName
				));
		}
		catch (Exception exception) {
			_log.error(exception);

			throw new FileServerUnavailableException(exception);
		}
	}

	public String getDownloadURL(String bucketName, String objectName)
		throws Exception {

		try {
			Storage storage = _getStorage();

			URL url = storage.signUrl(
				BlobInfo.newBuilder(
					BlobId.of(bucketName, objectName)
				).build(),
				15, TimeUnit.MINUTES, Storage.SignUrlOption.withV4Signature());

			return url.toString();
		}
		catch (StorageException storageException) {
			if ((storageException.getCode() == 500) ||
				(storageException.getCode() == 503)) {

				throw new FileServerUnavailableException(storageException);
			}

			throw storageException;
		}
		catch (Exception exception) {
			_log.error(exception);

			throw new FileServerUnavailableException(exception);
		}
	}

	public String getUploadSessionURL(
			String bucketName, String fileSize, String objectName,
			String origin)
		throws Exception {

		try {
			ResponseEntity<String> responseEntity = WebClient.create(
			).post(
			).uri(
				UriComponentsBuilder.fromUriString(
					_getBaseURL() + "/upload/storage/v1/b/{bucketName}" +
						"/o?name={objectName}&uploadType=resumable"
				).build(
					bucketName, objectName
				)
			).accept(
				MediaType.APPLICATION_JSON
			).header(
				HttpHeaders.AUTHORIZATION, "Bearer " + _getAccessToken()
			).header(
				HttpHeaders.CONTENT_LENGTH, fileSize
			).header(
				HttpHeaders.ORIGIN, origin
			).retrieve(
			).toEntity(
				String.class
			).block();

			if (responseEntity == null) {
				throw new FileServerUnavailableException();
			}

			HttpStatusCode statusCode = responseEntity.getStatusCode();

			if (statusCode.is5xxServerError()) {
				throw new FileServerUnavailableException(
					"Google cloud server returned error status: " + statusCode,
					null);
			}

			HttpHeaders httpHeaders = responseEntity.getHeaders();

			URI location = httpHeaders.getLocation();

			if (location == null) {
				throw new FileServerUnavailableException();
			}

			return location.toString();
		}
		catch (WebClientException webClientException) {
			_log.error(webClientException);

			throw new FileServerUnavailableException(webClientException);
		}
	}

	private String _getAccessToken() throws Exception {
		GoogleCredentials googleCredentials = _getStorageGoogleCredentials();

		googleCredentials.refreshIfExpired();

		AccessToken accessToken = googleCredentials.getAccessToken();

		if (accessToken == null) {
			throw new Exception("Unable to get access token");
		}

		return accessToken.getTokenValue();
	}

	private String _getBaseURL() {
		return "https://storage.googleapis.com";
	}

	private GoogleCredentials _getGoogleCredentials() throws Exception {
		GoogleCredentials googleCredentials = _googleCredentials;

		if (googleCredentials == null) {
			googleCredentials = GoogleCredentials.getApplicationDefault();

			_googleCredentials = googleCredentials;
		}

		return googleCredentials;
	}

	private String _getProjectId(GoogleCredentials googleCredentials) {
		if (Validator.isNotNull(_gcsProjectId)) {
			return _gcsProjectId;
		}

		if (googleCredentials instanceof ServiceAccountCredentials) {
			ServiceAccountCredentials serviceAccountCredentials =
				(ServiceAccountCredentials)googleCredentials;

			return serviceAccountCredentials.getProjectId();
		}

		return null;
	}

	private Storage _getStorage() throws Exception {
		Storage storage = _storage;

		if (storage != null) {
			return storage;
		}

		GoogleCredentials googleCredentials = _getStorageGoogleCredentials();

		StorageOptions.Builder builder = StorageOptions.newBuilder();

		builder.setCredentials(googleCredentials);

		String projectId = _getProjectId(googleCredentials);

		if (Validator.isNotNull(projectId)) {
			builder.setProjectId(projectId);
		}

		StorageOptions storageOptions = builder.build();

		storage = storageOptions.getService();

		_storage = storage;

		return storage;
	}

	private GoogleCredentials _getStorageGoogleCredentials() throws Exception {
		GoogleCredentials storageGoogleCredentials = _storageGoogleCredentials;

		if (storageGoogleCredentials != null) {
			return storageGoogleCredentials;
		}

		if (Validator.isNotNull(_gcsServiceAccount)) {
			storageGoogleCredentials = ImpersonatedCredentials.create(
				_getGoogleCredentials(), _gcsServiceAccount, null, _scopes,
				3600);
		}
		else if (Validator.isNotNull(_gcsServiceAccountKey)) {
			try (InputStream inputStream = new ByteArrayInputStream(
					_gcsServiceAccountKey.getBytes(StandardCharsets.UTF_8))) {

				storageGoogleCredentials = ServiceAccountCredentials.fromStream(
					inputStream);
			}

			storageGoogleCredentials = storageGoogleCredentials.createScoped(
				_scopes);
		}
		else {
			GoogleCredentials googleCredentials = _getGoogleCredentials();

			storageGoogleCredentials = googleCredentials.createScoped(_scopes);
		}

		_storageGoogleCredentials = storageGoogleCredentials;

		return storageGoogleCredentials;
	}

	private static final Log _log = LogFactory.getLog(
		GoogleCloudStorageService.class);

	private static final List<String> _scopes = Collections.singletonList(
		"https://www.googleapis.com/auth/cloud-platform");

	@Value("${liferay.one.gcs.project.id:}")
	private String _gcsProjectId;

	@Value("${liferay.one.gcs.service.account:}")
	private String _gcsServiceAccount;

	@Value("${liferay.one.gcs.service.account.key:}")
	private String _gcsServiceAccountKey;

	private volatile GoogleCredentials _googleCredentials;
	private volatile Storage _storage;
	private volatile GoogleCredentials _storageGoogleCredentials;

}