/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.IdTokenCredentials;
import com.google.auth.oauth2.IdTokenProvider;
import com.google.auth.oauth2.ImpersonatedCredentials;

import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.one.exception.DataOpsUnavailableException;
import com.liferay.portal.kernel.util.Validator;

import java.net.URI;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Felipe Veloso
 */
@Component
public class DataOpsUsageService extends BaseService {

	@Cacheable("composableAccountUsage")
	public String fetchComposableAccountUsage(String accountKey, String month)
		throws Exception {

		return _handleRequest(
			_gcfBaseURL + _FUNCTION_PATH_COMPOSABLE_USAGE_API,
			"account " + accountKey,
			UriComponentsBuilder.fromUriString(
				_gcfBaseURL
			).path(
				_FUNCTION_PATH_COMPOSABLE_USAGE_API +
					"/api/v1/accounts/{accountKey}/usage/month/{month}"
			).buildAndExpand(
				accountKey, month
			).toUri());
	}

	@Cacheable("customerAccountUsage")
	public String fetchCustomerAccountUsage(String accountKey)
		throws Exception {

		return _handleRequest(
			_gcfBaseURL + _FUNCTION_PATH_CUSTOMER_USAGE_API,
			"account " + accountKey,
			UriComponentsBuilder.fromUriString(
				_gcfBaseURL
			).path(
				_FUNCTION_PATH_CUSTOMER_USAGE_API +
					"/api/v1/customer/usage/accounts/{accountKey}"
			).buildAndExpand(
				accountKey
			).toUri());
	}

	@Cacheable("ldpProjectEventHistory")
	public String fetchLDPProjectEventHistory(
			String endDate, String granularity, String salesforceProjectId,
			String startDate)
		throws Exception {

		return _handleRequest(
			_ldpBaseURL, "project " + salesforceProjectId,
			UriComponentsBuilder.fromUriString(
				_ldpBaseURL
			).path(
				"/api/v1/projects/{salesforceProjectId}/ldp/usage/event-history"
			).queryParam(
				"endDate", endDate
			).queryParam(
				"granularity", granularity
			).queryParam(
				"startDate", startDate
			).buildAndExpand(
				salesforceProjectId
			).toUri());
	}

	@Cacheable("ldpProjectEventSummary")
	public String fetchLDPProjectEventSummary(
			String endDate, String salesforceProjectId, String startDate)
		throws Exception {

		return _handleRequest(
			_ldpBaseURL, "project " + salesforceProjectId,
			UriComponentsBuilder.fromUriString(
				_ldpBaseURL
			).path(
				"/api/v1/projects/{salesforceProjectId}/ldp/usage/event-summary"
			).queryParam(
				"endDate", endDate
			).queryParam(
				"startDate", startDate
			).buildAndExpand(
				salesforceProjectId
			).toUri());
	}

	@Cacheable("ldpProjectUsage")
	public String fetchLDPProjectUsage(String salesforceProjectId)
		throws Exception {

		return _handleRequest(
			_ldpBaseURL, "project " + salesforceProjectId,
			UriComponentsBuilder.fromUriString(
				_ldpBaseURL
			).path(
				"/api/v1/projects/{salesforceProjectId}/ldp/usage"
			).buildAndExpand(
				salesforceProjectId
			).toUri());
	}

	private String _getAuthorization(String audience) throws Exception {
		IdTokenCredentials idTokenCredentials = _getIdTokenCredentials(
			audience);

		idTokenCredentials.refreshIfExpired();

		AccessToken accessToken = idTokenCredentials.getAccessToken();

		if (accessToken == null) {
			throw new Exception(
				"Unable to get access token for audience " + audience);
		}

		return "Bearer " + accessToken.getTokenValue();
	}

	private IdTokenCredentials _getIdTokenCredentials(String audience)
		throws Exception {

		IdTokenProvider idTokenProvider = _getIdTokenProvider();

		return _idTokenCredentials.computeIfAbsent(
			audience,
			targetAudience -> IdTokenCredentials.newBuilder(
			).setIdTokenProvider(
				idTokenProvider
			).setTargetAudience(
				targetAudience
			).build());
	}

	private IdTokenProvider _getIdTokenProvider() throws Exception {
		if (_idTokenProvider != null) {
			return _idTokenProvider;
		}

		_idTokenProvider = _toIdTokenProvider(
			GoogleCredentials.getApplicationDefault());

		return _idTokenProvider;
	}

	private String _handleRequest(String audience, String subject, URI uri)
		throws Exception {

		String authorization = null;

		try {
			authorization = _getAuthorization(audience);
		}
		catch (Exception exception) {
			throw new DataOpsUnavailableException(
				"Unable to authenticate to DataOps for " + subject, exception);
		}

		try {
			return get(authorization, uri);
		}
		catch (WebClientResponseException webClientResponseException) {
			if (webClientResponseException.getStatusCode() ==
					HttpStatus.NOT_FOUND) {

				if (_log.isInfoEnabled()) {
					_log.info("No DataOps usage data for " + subject);
				}

				return null;
			}

			throw new DataOpsUnavailableException(
				"Unable to read DataOps usage for " + subject,
				webClientResponseException);
		}
		catch (WebClientException webClientException) {
			throw new DataOpsUnavailableException(
				"Unable to reach DataOps for " + subject, webClientException);
		}
	}

	private IdTokenProvider _toIdTokenProvider(
		GoogleCredentials googleCredentials) {

		if (Validator.isNull(_serviceAccount)) {
			return (IdTokenProvider)googleCredentials;
		}

		return ImpersonatedCredentials.create(
			googleCredentials, _serviceAccount, null, _scopes, 3600);
	}

	private static final String _FUNCTION_PATH_COMPOSABLE_USAGE_API =
		"/composable_usage_api";

	private static final String _FUNCTION_PATH_CUSTOMER_USAGE_API =
		"/customer_usage_api";

	private static final Log _log = LogFactory.getLog(
		DataOpsUsageService.class);

	private static final List<String> _scopes = Collections.singletonList(
		"https://www.googleapis.com/auth/cloud-platform");

	@Value("${liferay.one.gcf.base.url}")
	private String _gcfBaseURL;

	private final Map<String, IdTokenCredentials> _idTokenCredentials =
		new ConcurrentHashMap<>();
	private volatile IdTokenProvider _idTokenProvider;

	@Value("${liferay.one.ldp.base.url}")
	private String _ldpBaseURL;

	@Value("${liferay.one.dataops.service.account:}")
	private String _serviceAccount;

}