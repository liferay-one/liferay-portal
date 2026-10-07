/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.connectivity;

import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.json.webtoken.JsonWebSignature;
import com.google.api.client.json.webtoken.JsonWebToken;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.IdToken;
import com.google.auth.oauth2.IdTokenProvider;
import com.google.auth.oauth2.ImpersonatedCredentials;

import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import java.nio.charset.StandardCharsets;

import java.time.Duration;
import java.time.Instant;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * @author Allen Ziegenfus
 */
@Component
public class GoogleConnectivityCheck {

	@Async
	@EventListener(ApplicationReadyEvent.class)
	public void checkOnStartup() {
		if (!_enabled) {
			return;
		}

		GoogleCredentials googleCredentials = null;

		try {
			googleCredentials = GoogleCredentials.getApplicationDefault();
		}
		catch (Exception exception) {
			_log.error(
				"Unable to resolve application default credentials", exception);

			return;
		}

		Class<?> clazz = googleCredentials.getClass();

		_report(
			"Application default credentials", false,
			Collections.singletonList("resolved as " + clazz.getSimpleName()));

		_checkIdTokenDependency(
			"LDP usage API", googleCredentials, _ldpBaseURL, _ldpServiceAccount,
			_ldpBaseURL);
		_checkIdTokenDependency(
			"Composable usage API", googleCredentials,
			_gcfBaseURL + _FUNCTION_PATH_COMPOSABLE_USAGE_API,
			_composableServiceAccount,
			_gcfBaseURL + _FUNCTION_PATH_COMPOSABLE_USAGE_API);
		_checkIdTokenDependency(
			"Customer usage API", googleCredentials,
			_gcfBaseURL + _FUNCTION_PATH_CUSTOMER_USAGE_API,
			_customerServiceAccount,
			_gcfBaseURL + _FUNCTION_PATH_CUSTOMER_USAGE_API);
		_checkIdTokenDependency(
			"Salesforce marketplace API", googleCredentials,
			_salesforceGCFAudience, _salesforceGCFServiceAccount,
			_salesforceGCFBaseURL + _FUNCTION_PATH_MARKETPLACE_API);

		_checkGoogleCloudStorage(googleCredentials);

		_checkGooglePubsub(googleCredentials);
	}

	private void _checkGoogleCloudStorage(GoogleCredentials googleCredentials) {
		String name = "Google Cloud Storage";

		if (Validator.isNull(_gcsBucketName)) {
			_report(name, false, Collections.singletonList("not configured"));

			return;
		}

		List<String> details = new ArrayList<>();

		GoogleCredentials scopedGoogleCredentials = null;

		try {
			if (Validator.isNotNull(_gcsServiceAccount)) {
				details.add("impersonating " + _gcsServiceAccount);

				scopedGoogleCredentials = _impersonate(
					googleCredentials, _gcsServiceAccount);
			}
			else {
				details.add("using application default credentials");

				scopedGoogleCredentials = googleCredentials.createScoped(
					_scopes);
			}

			scopedGoogleCredentials.refreshIfExpired();

			AccessToken accessToken = scopedGoogleCredentials.getAccessToken();

			if (accessToken == null) {
				details.add("no access token was issued");

				_report(name, true, details);

				return;
			}

			details.add(
				"access token expires at " + accessToken.getExpirationTime());

			details.add(
				_getStatusCode(
					StringBundler.concat(
						_GCS_BASE_URL, "/storage/v1/b/", _gcsBucketName,
						"/o?fields=kind&maxResults=1"),
					accessToken.getTokenValue()));
		}
		catch (Exception exception) {
			details.add("unable to authenticate, " + exception);

			_report(name, true, details);

			return;
		}

		if (!(scopedGoogleCredentials instanceof ImpersonatedCredentials)) {
			details.add(
				"cannot sign download URLs without an impersonated service " +
					"account");

			_report(name, true, details);

			return;
		}

		try {
			ImpersonatedCredentials impersonatedCredentials =
				(ImpersonatedCredentials)scopedGoogleCredentials;

			impersonatedCredentials.sign(
				_SIGNATURE_PROBE.getBytes(StandardCharsets.UTF_8));

			details.add("can sign download URLs");

			_report(name, false, details);
		}
		catch (Exception exception) {
			details.add("unable to sign, " + exception);

			_report(name, true, details);
		}
	}

	private void _checkGooglePubsub(GoogleCredentials googleCredentials) {
		String name = "Google Pub/Sub";

		if (Validator.isNotNull(_pubsubClientEmailAddress)) {
			_report(
				name, false,
				Collections.singletonList(
					StringBundler.concat(
						"using the configured service account ",
						_pubsubClientEmailAddress,
						", whose key this check does not exercise")));

			return;
		}

		List<String> details = new ArrayList<>();

		details.add("using application default credentials");

		try {
			GoogleCredentials scopedGoogleCredentials =
				googleCredentials.createScoped(_scopes);

			scopedGoogleCredentials.refreshIfExpired();

			AccessToken accessToken = scopedGoogleCredentials.getAccessToken();

			if (accessToken == null) {
				details.add("no access token was issued");

				_report(name, true, details);

				return;
			}

			details.add(
				"access token expires at " + accessToken.getExpirationTime());

			_report(name, false, details);
		}
		catch (Exception exception) {
			details.add("unable to authenticate, " + exception);

			_report(name, true, details);
		}
	}

	private void _checkIdTokenDependency(
		String name, GoogleCredentials googleCredentials, String audience,
		String serviceAccount, String url) {

		if (Validator.isNull(audience) || Validator.isNull(url)) {
			_report(name, false, Collections.singletonList("not configured"));

			return;
		}

		List<String> details = new ArrayList<>();

		details.add("audience " + audience);

		IdTokenProvider idTokenProvider = null;

		if (Validator.isNotNull(serviceAccount)) {
			details.add("impersonating " + serviceAccount);

			try {
				idTokenProvider = _impersonate(
					googleCredentials, serviceAccount);
			}
			catch (Exception exception) {
				details.add("unable to impersonate, " + exception);

				_report(name, true, details);

				return;
			}
		}
		else if (googleCredentials instanceof IdTokenProvider) {
			details.add(
				"no service account is configured, using application default " +
					"credentials");

			idTokenProvider = (IdTokenProvider)googleCredentials;
		}
		else {
			details.add(
				"no service account is configured and application default " +
					"credentials cannot issue an ID token");

			_report(name, true, details);

			return;
		}

		try {
			IdToken idToken = idTokenProvider.idTokenWithAudience(
				audience,
				Collections.singletonList(
					IdTokenProvider.Option.INCLUDE_EMAIL));

			details.add(_getIdTokenDescription(idToken));

			details.add(_getStatusCode(url, idToken.getTokenValue()));

			_report(name, false, details);
		}
		catch (Exception exception) {
			details.add("unable to mint an ID token, " + exception);

			_report(name, true, details);
		}
	}

	private String _getIdTokenDescription(IdToken idToken) throws Exception {
		JsonWebSignature jsonWebSignature = JsonWebSignature.parse(
			GsonFactory.getDefaultInstance(), idToken.getTokenValue());

		JsonWebToken.Payload payload = jsonWebSignature.getPayload();

		return StringBundler.concat(
			"minted an ID token for ", payload.get("email"), " issued by ",
			payload.getIssuer(), " expiring at ",
			Instant.ofEpochSecond(payload.getExpirationTimeSeconds()));
	}

	private String _getStatusCode(String url, String authorization) {
		try {
			HttpClient httpClient = HttpClient.newBuilder(
			).connectTimeout(
				_TIMEOUT
			).build();

			HttpRequest httpRequest = HttpRequest.newBuilder(
			).uri(
				URI.create(url)
			).header(
				"Authorization", "Bearer " + authorization
			).timeout(
				_TIMEOUT
			).GET(
			).build();

			HttpResponse<Void> httpResponse = httpClient.send(
				httpRequest, HttpResponse.BodyHandlers.discarding());

			return StringBundler.concat(
				url, " answered ", httpResponse.statusCode());
		}
		catch (Exception exception) {
			return StringBundler.concat(
				"unable to reach ", url, ", ", exception);
		}
	}

	private ImpersonatedCredentials _impersonate(
		GoogleCredentials googleCredentials, String serviceAccount) {

		return ImpersonatedCredentials.create(
			googleCredentials, serviceAccount, null, _scopes,
			_IMPERSONATION_LIFETIME);
	}

	private void _report(String name, boolean failed, List<String> details) {
		String message = StringBundler.concat(
			"Connectivity check for ", name, ", ", String.join("; ", details));

		if (failed) {
			_log.error(message);

			return;
		}

		if (_log.isInfoEnabled()) {
			_log.info(message);
		}
	}

	private static final String _FUNCTION_PATH_COMPOSABLE_USAGE_API =
		"/composable_usage_api";

	private static final String _FUNCTION_PATH_CUSTOMER_USAGE_API =
		"/customer_usage_api";

	private static final String _FUNCTION_PATH_MARKETPLACE_API =
		"/marketplace-api";

	private static final String _GCS_BASE_URL =
		"https://storage.googleapis.com";

	private static final int _IMPERSONATION_LIFETIME = 3600;

	private static final Log _log = LogFactory.getLog(
		GoogleConnectivityCheck.class);

	private static final List<String> _scopes = Collections.singletonList(
		"https://www.googleapis.com/auth/cloud-platform");

	private static final String _SIGNATURE_PROBE = "connectivity";

	private static final Duration _TIMEOUT = Duration.ofSeconds(10);

	@Value("${liferay.one.gcf.composable.service.account:}")
	private String _composableServiceAccount;

	@Value("${liferay.one.gcf.customer.service.account:}")
	private String _customerServiceAccount;

	@Value("${liferay.one.connectivity.check.enabled:true}")
	private boolean _enabled;

	@Value("${liferay.one.gcf.base.url:}")
	private String _gcfBaseURL;

	@Value("${liferay.one.gcs.bucket.name:}")
	private String _gcsBucketName;

	@Value("${liferay.one.gcs.service.account:}")
	private String _gcsServiceAccount;

	@Value("${liferay.one.ldp.base.url:}")
	private String _ldpBaseURL;

	@Value("${liferay.one.ldp.service.account:}")
	private String _ldpServiceAccount;

	@Value(
		"${liferay.one.pubsub.service.account.credentials.client.email.address:}"
	)
	private String _pubsubClientEmailAddress;

	@Value("${liferay.one.salesforce.gcf.audience:}")
	private String _salesforceGCFAudience;

	@Value("${liferay.one.salesforce.gcf.base.url:}")
	private String _salesforceGCFBaseURL;

	@Value("${liferay.one.salesforce.gcf.service.account:}")
	private String _salesforceGCFServiceAccount;

}