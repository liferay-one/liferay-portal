/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.constants.ProductVersionConstants;
import com.liferay.one.model.ProductVersion;
import com.liferay.one.util.comparator.VersionComparator;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.net.URI;

import java.time.Duration;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import reactor.util.retry.Retry;

/**
 * @author Allen Ziegenfus
 */
@Component
public class ProductVersionService extends OneBaseService {

	public String getLatestProductGroupVersion(String productGroup)
		throws Exception {

		String latestProductGroupVersion = null;

		VersionComparator versionComparator = new VersionComparator();

		for (ProductVersion productVersion :
				getProductVersions(productGroup, true)) {

			String productGroupVersion =
				productVersion.getProductGroupVersion();

			if (latestProductGroupVersion == null) {
				latestProductGroupVersion = productGroupVersion;

				continue;
			}

			int compareTo = versionComparator.compare(
				productGroupVersion, latestProductGroupVersion);

			if (compareTo > 0) {
				latestProductGroupVersion = productGroupVersion;
			}
		}

		return latestProductGroupVersion;
	}

	public ProductVersion getProductVersion(String productGroup, String version)
		throws Exception {

		List<ProductVersion> productVersions = _getProductVersions(
			StringBundler.concat(
				"(productGroup eq '", productGroup,
				"') and (productVersion eq '", version, "')"));

		if (productVersions.isEmpty()) {
			return null;
		}

		return productVersions.get(0);
	}

	public List<ProductVersion> getProductVersions(String productGroup)
		throws Exception {

		return _getProductVersions(
			StringBundler.concat(
				"(productGroup eq '", productGroup, "') and (versionLevel eq '",
				ProductVersionConstants.LEVEL_MAJOR, "')"));
	}

	public List<ProductVersion> getProductVersions(
			String productGroup, boolean supported)
		throws Exception {

		return _getProductVersions(
			StringBundler.concat(
				"(productGroup eq '", productGroup, "') and (supported eq ",
				supported, ") and (versionLevel eq '",
				ProductVersionConstants.LEVEL_MAJOR, "')"));
	}

	@EventListener(ApplicationReadyEvent.class)
	public void onApplicationReady() {
		try {
			syncProductVersions();
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync product versions on application startup",
				exception);
		}
	}

	@Scheduled(cron = "${liferay.one.product.version.sync.cron}")
	public void syncProductVersions() throws Exception {
		if (_log.isInfoEnabled()) {
			_log.info("Syncing product versions from " + _releasesURL);
		}

		JSONArray releasesJSONArray = new JSONArray(
			get(
				StringPool.BLANK,
				UriComponentsBuilder.fromUriString(
					_releasesURL
				).build(
				).toUri()));

		if (_log.isInfoEnabled()) {
			_log.info("Fetched " + releasesJSONArray.length() + " releases");
		}

		_waitUntilReady(getAuthorization());

		for (String productGroup : _productGroups) {
			_syncProductGroup(productGroup, releasesJSONArray);
		}
	}

	private JSONObject _createProductVersionJSONObject(
		String productGroup, String productGroupVersion, boolean supported,
		String type, String version, String versionLevel) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"externalReferenceCode", version
		).put(
			"productGroup", productGroup
		).put(
			"productGroupVersion", productGroupVersion
		).put(
			"productVersion", version
		).put(
			"supported", supported
		).put(
			"versionLevel",
			new JSONObject(
			).put(
				"key", versionLevel
			)
		);

		if (Validator.isNotNull(type)) {
			jsonObject.put(
				"type",
				new JSONObject(
				).put(
					"key", type
				));
		}

		return jsonObject;
	}

	private String _getMajorVersionType(String productGroupVersion) {
		Matcher matcher = _quarterlyProductGroupVersionPattern.matcher(
			productGroupVersion);

		if (matcher.matches()) {
			return ProductVersionConstants.TYPE_QUARTERLY;
		}

		return null;
	}

	private List<ProductVersion> _getProductVersions(String filterString)
		throws Exception {

		return getAllItems(
			"/o/c/productversions", filterString, ProductVersion::new);
	}

	private String _getType(String version) {
		Matcher matcher = _versionTypePattern.matcher(version);

		if (!matcher.find()) {
			return null;
		}

		String marker = matcher.group(1);

		if (marker == null) {
			return ProductVersionConstants.TYPE_QUARTERLY;
		}

		marker = StringUtil.toUpperCase(marker);

		if (marker.equals("DE")) {
			return ProductVersionConstants.TYPE_DIGITAL_ENTERPRISE;
		}
		else if (marker.equals("FP")) {
			return ProductVersionConstants.TYPE_FIX_PACK;
		}
		else if (marker.equals("GA")) {
			return ProductVersionConstants.TYPE_GENERAL_AVAILABILITY;
		}
		else if (marker.equals("SP")) {
			return ProductVersionConstants.TYPE_SERVICE_PACK;
		}
		else if (marker.equals("U")) {
			return ProductVersionConstants.TYPE_UPDATE;
		}

		return null;
	}

	private boolean _isRetryable(Throwable throwable) {
		if (throwable instanceof WebClientResponseException) {
			WebClientResponseException webClientResponseException =
				(WebClientResponseException)throwable;

			int statusCode = webClientResponseException.getStatusCode(
			).value();

			if ((statusCode == 401) || (statusCode == 403)) {
				return false;
			}
		}

		return true;
	}

	private boolean _isSupported(JSONArray tagsJSONArray) {
		if (tagsJSONArray == null) {
			return false;
		}

		for (int i = 0; i < tagsJSONArray.length(); i++) {
			if (StringUtil.equals(tagsJSONArray.optString(i), "supported")) {
				return true;
			}
		}

		return false;
	}

	private void _syncProductGroup(
			String productGroup, JSONArray releasesJSONArray)
		throws Exception {

		Map<String, JSONObject> productVersionJSONObjects = new TreeMap<>();

		for (int i = 0; i < releasesJSONArray.length(); i++) {
			JSONObject releaseJSONObject = releasesJSONArray.getJSONObject(i);

			String productGroupVersion = releaseJSONObject.optString(
				"productGroupVersion");

			if (!StringUtil.equals(
					releaseJSONObject.optString("product"), productGroup) ||
				Validator.isNull(productGroupVersion)) {

				continue;
			}

			productGroupVersion = StringUtil.toUpperCase(productGroupVersion);

			boolean supported = _isSupported(
				releaseJSONObject.optJSONArray("tags"));

			String majorVersion = releaseJSONObject.optString(
				"productMajorVersion");

			if (Validator.isNull(majorVersion)) {
				majorVersion = StringBundler.concat(
					StringUtil.toUpperCase(productGroup), StringPool.SPACE,
					productGroupVersion);
			}

			JSONObject majorVersionJSONObject = productVersionJSONObjects.get(
				majorVersion);

			if (majorVersionJSONObject == null) {
				productVersionJSONObjects.put(
					majorVersion,
					_createProductVersionJSONObject(
						productGroup, productGroupVersion, supported,
						_getMajorVersionType(productGroupVersion), majorVersion,
						ProductVersionConstants.LEVEL_MAJOR));
			}
			else if (supported) {
				majorVersionJSONObject.put("supported", true);
			}

			String version = releaseJSONObject.optString("productVersion");

			if (Validator.isNull(version)) {
				continue;
			}

			productVersionJSONObjects.put(
				version,
				_createProductVersionJSONObject(
					productGroup, productGroupVersion, supported,
					_getType(version), version,
					ProductVersionConstants.LEVEL_PATCH));
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Syncing ", productVersionJSONObjects.size(),
					" product versions for product group ", productGroup));
		}

		String authorization = getAuthorization();

		if (Validator.isNull(authorization)) {
			_log.error(
				StringBundler.concat(
					"Unable to sync product versions for product group ",
					productGroup, ": no authorization token was obtained"));

			return;
		}

		int count = 0;

		for (JSONObject productVersionJSONObject :
				productVersionJSONObjects.values()) {

			String externalReferenceCode = productVersionJSONObject.getString(
				"externalReferenceCode");
			String version = productVersionJSONObject.getString(
				"productVersion");

			URI uri = UriComponentsBuilder.fromPath(
				"/o/c/productversions/by-external-reference-code/" +
					externalReferenceCode
			).build(
			).encode(
			).toUri();

			if (_log.isDebugEnabled()) {
				_log.debug(
					StringBundler.concat(
						"Syncing product version ", version, " to ", uri,
						" with payload ", productVersionJSONObject));
			}

			try {
				String response = put(
					authorization, productVersionJSONObject.toString(), uri);

				if ((response != null) &&
					!new JSONObject(
						response).isNull(
							"id"
						)) {

					count++;
				}
				else {
					_log.error(
						StringBundler.concat(
							"Unable to sync product version ", version, " to ",
							uri, ": unexpected response ", response));
				}
			}
			catch (WebClientResponseException webClientResponseException) {
				_log.error(
					StringBundler.concat(
						"Unable to sync product version ", version, " to ", uri,
						": ", webClientResponseException.getStatusCode(), " ",
						webClientResponseException.getResponseBodyAsString()));
			}
			catch (Exception exception) {
				_log.error(
					"Unable to sync product version " + version, exception);
			}
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Synced ", count, " product versions for product group ",
					productGroup));
		}
	}

	private void _waitUntilReady(String authorization) {
		if (_log.isInfoEnabled()) {
			_log.info(
				"Waiting for the product version object endpoint to be ready");
		}

		URI uri = UriComponentsBuilder.fromPath(
			"/o/c/productversions"
		).queryParam(
			"pageSize", 1
		).build(
		).toUri();

		Mono.fromCallable(
			() -> get(authorization, uri)
		).retryWhen(
			Retry.backoff(
				_READINESS_MAX_RETRIES, Duration.ofSeconds(2)
			).maxBackoff(
				Duration.ofSeconds(20)
			).scheduler(
				Schedulers.boundedElastic()
			).filter(
				this::_isRetryable
			).onRetryExhaustedThrow(
				(retryBackoffSpec, retrySignal) -> retrySignal.failure()
			)
		).block();
	}

	private static final long _READINESS_MAX_RETRIES = 6;

	private static final Log _log = LogFactory.getLog(
		ProductVersionService.class);

	private static final Pattern _quarterlyProductGroupVersionPattern =
		Pattern.compile("\\d{4}\\.Q[1-4]", Pattern.CASE_INSENSITIVE);
	private static final Pattern _versionTypePattern = Pattern.compile(
		"\\d{4}\\.Q[1-4]\\.\\d+|\\s(DE|FP|GA|SP|U)\\d+",
		Pattern.CASE_INSENSITIVE);

	@Value("${liferay.one.product.version.sync.product.groups}")
	private String[] _productGroups;

	@Value("${liferay.one.product.version.sync.releases.url}")
	private String _releasesURL;

}