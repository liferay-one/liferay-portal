/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.petra.string.StringBundler;

import java.util.Base64;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Caleb Hall
 * @author Ricardo Mariz
 */
@Component
public class AnalyticsService extends BaseService {

	public JSONObject getAnalyticsCloudContextJSONObject(
		String environmentName) {

		if (Objects.equals(environmentName, "internal")) {
			return new JSONObject(
			).put(
				"emailAddress", _analyticsCloudInternalAuthEmailAddress
			).put(
				"password", _analyticsCloudInternalAuthPassword
			).put(
				"url", _analyticsCloudInternalAuthUrl
			);
		}

		return new JSONObject(
		).put(
			"emailAddress", _analyticsCloudAuthEmailAddress
		).put(
			"password", _analyticsCloudAuthPassword
		).put(
			"url", _analyticsCloudAuthUrl
		);
	}

	public JSONObject getAnalyticsCloudProjectJSONObject(
		JSONObject analyticsCloudContextJSONObject, String corpProjectUuid) {

		try {
			JSONObject jsonObject = new JSONObject(
				get(
					getAuthorization(analyticsCloudContextJSONObject),
					UriComponentsBuilder.fromUriString(
						analyticsCloudContextJSONObject.getString("url")
					).path(
						"/o/faro/main/project/corpProjectUuid/" +
							corpProjectUuid
					).build(
					).toUri()));

			if (jsonObject.optInt("groupId") == 0) {
				return null;
			}

			return jsonObject;
		}
		catch (WebClientResponseException webClientResponseException) {
			if (_log.isDebugEnabled()) {
				_log.debug(
					StringBundler.concat(
						"Unable to get Analytics Cloud project ",
						corpProjectUuid, ": \n",
						webClientResponseException.getResponseBodyAsString()));
			}

			return null;
		}
	}

	public String getAuthorization(JSONObject analyticsCloudContextJSONObject) {
		Base64.Encoder encoder = Base64.getEncoder();

		String authorization =
			analyticsCloudContextJSONObject.getString("emailAddress") + ":" +
				analyticsCloudContextJSONObject.getString("password");

		return "Basic " + encoder.encodeToString(authorization.getBytes());
	}

	public JSONObject provisionAnalyticsCloudProject(
			JSONObject analyticsCloudContextJSONObject,
			JSONObject analyticsCloudProjectJSONObject)
		throws Exception {

		try {
			String response = WebClient.builder(
			).baseUrl(
				analyticsCloudContextJSONObject.getString("url")
			).defaultHeader(
				HttpHeaders.AUTHORIZATION,
				getAuthorization(analyticsCloudContextJSONObject)
			).build(
			).post(
			).uri(
				"/o/faro/main/project/provisioned"
			).contentType(
				MediaType.APPLICATION_FORM_URLENCODED
			).body(
				BodyInserters.fromFormData(
					"corpProjectName",
					analyticsCloudProjectJSONObject.optString("corpProjectName")
				).with(
					"corpProjectUuid",
					analyticsCloudProjectJSONObject.optString("corpProjectUuid")
				).with(
					"enableAutoConfiguration",
					String.valueOf(
						analyticsCloudProjectJSONObject.optBoolean(
							"enableAutoConfiguration", true))
				).with(
					"friendlyURL",
					analyticsCloudProjectJSONObject.optString("friendlyURL")
				).with(
					"incidentReportEmailAddresses",
					analyticsCloudProjectJSONObject.getJSONArray(
						"incidentReportEmailAddresses"
					).toString()
				).with(
					"name", analyticsCloudProjectJSONObject.getString("name")
				).with(
					"ownerEmailAddress",
					analyticsCloudProjectJSONObject.getString(
						"ownerEmailAddress")
				).with(
					"serverLocation",
					analyticsCloudProjectJSONObject.getString("serverLocation")
				).with(
					"sharedCluster", "false"
				).with(
					"trial", "false"
				)
			).retrieve(
			).bodyToMono(
				String.class
			).block();

			if (_log.isInfoEnabled()) {
				_log.info("Analytics Cloud project created " + response);
			}

			return new JSONObject(response);
		}
		catch (WebClientResponseException webClientResponseException) {
			_log.error(
				StringBundler.concat(
					"Unable to provision Analytics Cloud project ",
					analyticsCloudProjectJSONObject, ": \n",
					webClientResponseException.getResponseBodyAsString()));

			throw webClientResponseException;
		}
	}

	public JSONObject provisionAnalyticsCloudProject(
			String analyticsCloudEnvironment,
			JSONObject analyticsCloudProjectJSONObject, String corpProjectUuid)
		throws Exception {

		JSONObject analyticsCloudContextJSONObject =
			getAnalyticsCloudContextJSONObject(analyticsCloudEnvironment);

		JSONObject curAnalyticsCloudProjectJSONObject =
			getAnalyticsCloudProjectJSONObject(
				analyticsCloudContextJSONObject, corpProjectUuid);

		if (curAnalyticsCloudProjectJSONObject != null) {
			return curAnalyticsCloudProjectJSONObject;
		}

		if (Objects.equals(analyticsCloudEnvironment, "internal")) {
			analyticsCloudProjectJSONObject.put(
				"serverLocation", "us-west1-ac-uat-c1");
		}

		analyticsCloudProjectJSONObject.put("corpProjectUuid", corpProjectUuid);

		return provisionAnalyticsCloudProject(
			analyticsCloudContextJSONObject, analyticsCloudProjectJSONObject);
	}

	private static final Log _log = LogFactory.getLog(AnalyticsService.class);

	@Value("${liferay.one.analytics.cloud.auth.email.address}")
	private String _analyticsCloudAuthEmailAddress;

	@Value("${liferay.one.analytics.cloud.auth.password}")
	private String _analyticsCloudAuthPassword;

	@Value("${liferay.one.analytics.cloud.auth.url}")
	private String _analyticsCloudAuthUrl;

	@Value("${liferay.one.analytics.cloud.internal.auth.email.address}")
	private String _analyticsCloudInternalAuthEmailAddress;

	@Value("${liferay.one.analytics.cloud.internal.auth.password}")
	private String _analyticsCloudInternalAuthPassword;

	@Value("${liferay.one.analytics.cloud.internal.auth.url}")
	private String _analyticsCloudInternalAuthUrl;

}