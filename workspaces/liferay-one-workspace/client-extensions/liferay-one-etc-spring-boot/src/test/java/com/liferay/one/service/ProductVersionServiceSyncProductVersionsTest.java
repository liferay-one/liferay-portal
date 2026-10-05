/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import java.net.URI;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
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
import org.springframework.test.util.ReflectionTestUtils;

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

	public static class TestProductVersionService
		extends ProductVersionService {

		public int getAllItemsCount;
		public final List<String> putBodies = new ArrayList<>();
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

	private ProductVersionService _productVersionService;
	private TestProductVersionService _testProductVersionService;

}