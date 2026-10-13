/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import java.net.URI;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.aop.framework.ProxyFactory;
import org.springframework.cache.annotation.AnnotationCacheOperationSource;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.cache.interceptor.CacheInterceptor;
import org.springframework.http.HttpHeaders;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CRON-SYNCPRODUCTVERSIONS] " +
		"[LSN-PRODUCTVERSIONSERVICE-ONAPPLICATIONREADY] " +
			"ProductVersionService#syncProductVersions"
)
public class ProductVersionServiceSyncProductVersionsTest {

	@BeforeEach
	public void setUp() {
		_testProductVersionService = new TestProductVersionService();

		ReflectionTestUtils.setField(
			_testProductVersionService, "_productGroups", new String[] {"dxp"});
		ReflectionTestUtils.setField(
			_testProductVersionService, "_releasesURL",
			"https://releases.example.com/releases.json");

		_productVersionService = _createCachingProxy(
			_testProductVersionService);
	}

	@Test
	public void testOnApplicationReadyLogsWhenSyncFails() {
		_testProductVersionService.releasesFailure = new RuntimeException(
			"Unable to read releases");

		Assertions.assertDoesNotThrow(
			_productVersionService::onApplicationReady);

		Assertions.assertEquals(
			1, _testProductVersionService.releasesFetchCount);
		Assertions.assertTrue(_testProductVersionService.putBodies.isEmpty());
	}

	@Test
	public void testOnApplicationReadySyncsProductVersionsOnce() {
		_productVersionService.onApplicationReady();

		Assertions.assertEquals(
			1, _testProductVersionService.releasesFetchCount);
		Assertions.assertFalse(_testProductVersionService.putBodies.isEmpty());
	}

	@Test
	public void testSyncProductVersionsKeepsCacheWhenParseFails()
		throws Exception {

		_assertCachedProductVersions();

		_testProductVersionService.releasesResponse = "not json";

		Assertions.assertThrows(
			JSONException.class, _productVersionService::syncProductVersions);

		_productVersionService.getProductVersions("dxp", true);

		Assertions.assertEquals(1, _testProductVersionService.getAllItemsCount);
	}

	@Test
	public void testSyncProductVersionsKeepsCacheWhenReleasesFetchFails()
		throws Exception {

		_assertCachedProductVersions();

		_testProductVersionService.releasesFailure = new RuntimeException(
			"Unable to read releases");

		Assertions.assertThrows(
			RuntimeException.class,
			_productVersionService::syncProductVersions);

		_productVersionService.getProductVersions("dxp", true);

		Assertions.assertEquals(1, _testProductVersionService.getAllItemsCount);
	}

	@Test
	public void testSyncProductVersionsRefreshesCache() throws Exception {
		_assertCachedProductVersions();

		_productVersionService.syncProductVersions();

		_productVersionService.getProductVersions("dxp", true);

		Assertions.assertEquals(2, _testProductVersionService.getAllItemsCount);

		int putCount = _testProductVersionService.putBodies.size();

		Assertions.assertTrue(putCount > 0);

		_productVersionService.syncProductVersions();

		Assertions.assertEquals(
			putCount * 2, _testProductVersionService.putBodies.size());
	}

	@Test
	public void testSyncProductVersionsSetsBundleURL() throws Exception {
		_testProductVersionService.releasesResponse = new JSONArray(
		).put(
			_createReleaseJSONObject(
				"2026.q3.7", "2026.q3", "DXP 2026.Q3", "DXP 2026.Q3.7")
		).put(
			_createReleaseJSONObject(
				"2026.q1.13-lts", "2026.q1", "DXP 2026.Q1",
				"DXP 2026.Q1.13 LTS")
		).toString();

		_testProductVersionService.releaseProperties.put(
			_RELEASES_CDN_URL + "/2026.q3.7/release.properties",
			"bundle.url=" + _RELEASES_CDN_URL + "/2026.q3.7/bundle.zip");
		_testProductVersionService.releaseProperties.put(
			_RELEASES_CDN_URL + "/2026.q1.13-lts/release.properties",
			"bundle.url=" + _RELEASES_CDN_URL + "/2026.q1.13-lts/bundle.zip");

		_productVersionService.syncProductVersions();

		Map<String, JSONObject> jsonObjects = _getPutJSONObjects();

		Assertions.assertEquals(
			_RELEASES_CDN_URL + "/2026.q3.7/bundle.zip",
			jsonObjects.get(
				"DXP 2026.Q3.7"
			).getString(
				"bundleURL"
			));
		Assertions.assertEquals(
			_RELEASES_CDN_URL + "/2026.q1.13-lts/bundle.zip",
			jsonObjects.get(
				"DXP 2026.Q1.13 LTS"
			).getString(
				"bundleURL"
			));
		Assertions.assertFalse(
			jsonObjects.get(
				"DXP 2026.Q3"
			).has(
				"bundleURL"
			));
		Assertions.assertFalse(
			jsonObjects.get(
				"DXP 2026.Q1"
			).has(
				"bundleURL"
			));
	}

	@Test
	public void testSyncProductVersionsSetsBundleURLForLegacyVersions()
		throws Exception {

		_testProductVersionService.releasesResponse = new JSONArray(
		).put(
			_createReleaseJSONObject(
				"7.4.13-u112", "7.4", "DXP 7.4", "DXP 7.4.13 U112")
		).toString();

		_testProductVersionService.releaseProperties.put(
			_RELEASES_CDN_URL + "/7.4.13-u112/release.properties",
			"bundle.url=" + _RELEASES_CDN_URL + "/7.4.13-u112/bundle.7z");

		_productVersionService.syncProductVersions();

		Map<String, JSONObject> jsonObjects = _getPutJSONObjects();

		Assertions.assertEquals(
			_RELEASES_CDN_URL + "/7.4.13-u112/bundle.7z",
			jsonObjects.get(
				"DXP 7.4.13 U112"
			).getString(
				"bundleURL"
			));
		Assertions.assertFalse(
			jsonObjects.get(
				"DXP 7.4"
			).has(
				"bundleURL"
			));
	}

	@Test
	public void testSyncProductVersionsSkipsPatchWhenBundleURLIsMissing()
		throws Exception {

		_testProductVersionService.releasesResponse = new JSONArray(
		).put(
			_createReleaseJSONObject(
				"2026.q3.6", "2026.q3", "DXP 2026.Q3", "DXP 2026.Q3.6")
		).put(
			_createReleaseJSONObject(
				"2026.q3.7", "2026.q3", "DXP 2026.Q3", "DXP 2026.Q3.7")
		).toString();

		_testProductVersionService.releaseProperties.put(
			_RELEASES_CDN_URL + "/2026.q3.6/release.properties",
			"build.timestamp=1");
		_testProductVersionService.releaseProperties.put(
			_RELEASES_CDN_URL + "/2026.q3.7/release.properties",
			"bundle.url=" + _RELEASES_CDN_URL + "/2026.q3.7/bundle.zip");

		_productVersionService.syncProductVersions();

		Map<String, JSONObject> jsonObjects = _getPutJSONObjects();

		Assertions.assertEquals(2, jsonObjects.size());
		Assertions.assertFalse(jsonObjects.containsKey("DXP 2026.Q3.6"));
		Assertions.assertEquals(
			_RELEASES_CDN_URL + "/2026.q3.7/bundle.zip",
			jsonObjects.get(
				"DXP 2026.Q3.7"
			).getString(
				"bundleURL"
			));
		Assertions.assertTrue(jsonObjects.containsKey("DXP 2026.Q3"));
	}

	@Test
	public void testSyncProductVersionsSkipsPatchWhenReleasePropertiesAreMissing()
		throws Exception {

		_testProductVersionService.releasesResponse = new JSONArray(
		).put(
			_createReleaseJSONObject(
				"2026.q3.6", "2026.q3", "DXP 2026.Q3", "DXP 2026.Q3.6")
		).put(
			_createReleaseJSONObject(
				"2026.q3.7", "2026.q3", "DXP 2026.Q3", "DXP 2026.Q3.7")
		).toString();

		_testProductVersionService.releaseProperties.put(
			_RELEASES_CDN_URL + "/2026.q3.7/release.properties",
			"bundle.url=" + _RELEASES_CDN_URL + "/2026.q3.7/bundle.zip");

		_productVersionService.syncProductVersions();

		Map<String, JSONObject> jsonObjects = _getPutJSONObjects();

		Assertions.assertEquals(2, jsonObjects.size());
		Assertions.assertFalse(jsonObjects.containsKey("DXP 2026.Q3.6"));
		Assertions.assertEquals(
			_RELEASES_CDN_URL + "/2026.q3.7/bundle.zip",
			jsonObjects.get(
				"DXP 2026.Q3.7"
			).getString(
				"bundleURL"
			));
		Assertions.assertTrue(jsonObjects.containsKey("DXP 2026.Q3"));
	}

	@Test
	public void testSyncProductVersionsSkipsPatchWhenReleasePropertiesFetchFails()
		throws Exception {

		JSONObject releaseJSONObject = _createReleaseJSONObject(
			"2026.q3.6", "2026.q3", "DXP 2026.Q3", "DXP 2026.Q3.6");

		releaseJSONObject.put(
			"tags",
			new JSONArray(
			).put(
				"supported"
			));

		_testProductVersionService.releasesResponse = new JSONArray(
		).put(
			releaseJSONObject
		).put(
			_createReleaseJSONObject(
				"2026.q3.7", "2026.q3", "DXP 2026.Q3", "DXP 2026.Q3.7")
		).toString();

		_testProductVersionService.releaseProperties.put(
			_RELEASES_CDN_URL + "/2026.q3.6/release.properties",
			new RuntimeException("Unable to read release properties"));
		_testProductVersionService.releaseProperties.put(
			_RELEASES_CDN_URL + "/2026.q3.7/release.properties",
			"bundle.url=" + _RELEASES_CDN_URL + "/2026.q3.7/bundle.zip");

		_productVersionService.syncProductVersions();

		Map<String, JSONObject> jsonObjects = _getPutJSONObjects();

		Assertions.assertEquals(2, jsonObjects.size());
		Assertions.assertFalse(jsonObjects.containsKey("DXP 2026.Q3.6"));
		Assertions.assertEquals(
			_RELEASES_CDN_URL + "/2026.q3.7/bundle.zip",
			jsonObjects.get(
				"DXP 2026.Q3.7"
			).getString(
				"bundleURL"
			));
		Assertions.assertTrue(
			jsonObjects.get(
				"DXP 2026.Q3"
			).getBoolean(
				"supported"
			));
	}

	@Test
	public void testSyncProductVersionsSkipsPatchWhenURLIsMissing()
		throws Exception {

		_productVersionService.syncProductVersions();

		Map<String, JSONObject> jsonObjects = _getPutJSONObjects();

		Assertions.assertEquals(1, jsonObjects.size());
		Assertions.assertFalse(jsonObjects.containsKey("DXP 2026.Q1.0"));
		Assertions.assertTrue(jsonObjects.containsKey("DXP 2026.Q1"));
	}

	public static class TestProductVersionService
		extends ProductVersionService {

		public int getAllItemsCount;
		public final List<String> putBodies = new ArrayList<>();
		public final Map<String, Object> releaseProperties = new HashMap<>();
		public RuntimeException releasesFailure;
		public int releasesFetchCount;
		public String releasesResponse = new JSONArray(
		).put(
			new JSONObject(
			).put(
				"product", "dxp"
			).put(
				"productGroupVersion", "2026.q1"
			).put(
				"productVersion", "DXP 2026.Q1.0"
			).put(
				"tags",
				new JSONArray(
				).put(
					"supported"
				)
			)
		).toString();

		@Override
		protected String get(String authorization, URI uri) {
			if (!authorization.isEmpty()) {
				return "{}";
			}

			String path = uri.getPath();

			if (path.endsWith("/release.properties")) {
				Object value = releaseProperties.get(uri.toString());

				if (value instanceof RuntimeException) {
					throw (RuntimeException)value;
				}

				if (value == null) {
					throw WebClientResponseException.create(
						404, "Not Found", HttpHeaders.EMPTY, new byte[0], null);
				}

				return (String)value;
			}

			releasesFetchCount++;

			if (releasesFailure != null) {
				throw releasesFailure;
			}

			return releasesResponse;
		}

		@Override
		protected <T> List<T> getAllItems(
			String path, String filterString,
			Function<JSONObject, T> function) {

			getAllItemsCount++;

			return Collections.emptyList();
		}

		@Override
		protected String getAuthorization() {
			return "Bearer test";
		}

		@Override
		protected String put(String authorization, String body, URI uri) {
			putBodies.add(body);

			return "{\"id\": 1}";
		}

	}

	private void _assertCachedProductVersions() throws Exception {
		_productVersionService.getProductVersions("dxp", true);
		_productVersionService.getProductVersions("dxp", true);

		Assertions.assertEquals(1, _testProductVersionService.getAllItemsCount);
	}

	private <T> T _createCachingProxy(T target) {
		CacheInterceptor cacheInterceptor = new CacheInterceptor();

		cacheInterceptor.setCacheManager(new ConcurrentMapCacheManager());
		cacheInterceptor.setCacheOperationSource(
			new AnnotationCacheOperationSource());

		cacheInterceptor.afterPropertiesSet();
		cacheInterceptor.afterSingletonsInstantiated();

		ProxyFactory proxyFactory = new ProxyFactory(target);

		proxyFactory.addAdvice(cacheInterceptor);
		proxyFactory.setProxyTargetClass(true);

		return (T)proxyFactory.getProxy();
	}

	private JSONObject _createReleaseJSONObject(
		String folder, String productGroupVersion, String productMajorVersion,
		String productVersion) {

		return new JSONObject(
		).put(
			"product", "dxp"
		).put(
			"productGroupVersion", productGroupVersion
		).put(
			"productMajorVersion", productMajorVersion
		).put(
			"productVersion", productVersion
		).put(
			"url", _RELEASES_CDN_URL + "/" + folder
		);
	}

	private Map<String, JSONObject> _getPutJSONObjects() {
		Map<String, JSONObject> jsonObjects = new HashMap<>();

		for (String body : _testProductVersionService.putBodies) {
			JSONObject jsonObject = new JSONObject(body);

			jsonObjects.put(
				jsonObject.getString("externalReferenceCode"), jsonObject);
		}

		return jsonObjects;
	}

	private static final String _RELEASES_CDN_URL =
		"https://releases-cdn.liferay.com/dxp";

	private ProductVersionService _productVersionService;
	private TestProductVersionService _testProductVersionService;

}