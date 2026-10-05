/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.converter.JiraBusinessEventConverter;
import com.liferay.one.jira.converter.JiraBusinessEventVersionConverter;

import java.util.Collections;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.aop.framework.ProxyFactory;
import org.springframework.cache.annotation.AnnotationCacheOperationSource;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.cache.interceptor.CacheInterceptor;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CRON-SCHEDULEDASSETOBJECTSCACHEEVICTION] " +
		"JiraBusinessEventService#scheduledAssetObjectsCacheEviction"
)
public class JiraBusinessEventServiceScheduledAssetObjectsCacheEvictionTest {

	@BeforeEach
	public void setUp() throws Exception {
		_jiraAssetPersistence = Mockito.mock(JiraAssetPersistence.class);

		JiraBusinessEventService jiraBusinessEventService =
			new JiraBusinessEventService();

		ReflectionTestUtils.setField(
			jiraBusinessEventService, "_accountAssetService",
			Mockito.mock(AccountAssetService.class));
		ReflectionTestUtils.setField(
			jiraBusinessEventService, "_businessEventConverter",
			Mockito.mock(JiraBusinessEventConverter.class));
		ReflectionTestUtils.setField(
			jiraBusinessEventService, "_businessEventVersionConverter",
			Mockito.mock(JiraBusinessEventVersionConverter.class));
		ReflectionTestUtils.setField(
			jiraBusinessEventService, "_jiraAssetPersistence",
			_jiraAssetPersistence);

		_jiraBusinessEventService = _createCachingProxy(
			jiraBusinessEventService);

		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				ArgumentMatchers.anyString(), ArgumentMatchers.any())
		).thenReturn(
			Collections.emptyList()
		);

		Mockito.when(
			_jiraAssetPersistence.getObjectTypeAttributes(
				ArgumentMatchers.any())
		).thenReturn(
			new JSONArray(
			).put(
				new JSONObject(
				).put(
					"name", "status"
				).put(
					"options", "Open, Closed"
				)
			)
		);
	}

	@Test
	public void testScheduledAssetObjectsCacheEvictionEvictsEveryAssetObjectCache()
		throws Exception {

		CacheEvict cacheEvict = JiraBusinessEventService.class.getMethod(
			"scheduledAssetObjectsCacheEviction"
		).getAnnotation(
			CacheEvict.class
		);

		Assertions.assertTrue(cacheEvict.allEntries());
		Assertions.assertEquals(
			List.of(
				"assetObjectFieldOptions", "assetObjectTypeAttributeIds",
				"assetObjectTypeAttributeOptions", "assetObjectTypeIds",
				"productVersions"),
			List.of(cacheEvict.value()));
	}

	@Test
	public void testScheduledAssetObjectsCacheEvictionEvictsJiraAssetSchemaLoaderCaches()
		throws Exception {

		JiraAssetSchemaLoader jiraAssetSchemaLoader =
			new JiraAssetSchemaLoader();

		ReflectionTestUtils.setField(
			jiraAssetSchemaLoader, "_jiraAssetPersistence",
			_jiraAssetPersistence);

		jiraAssetSchemaLoader = _createCachingProxy(jiraAssetSchemaLoader);

		Mockito.when(
			_jiraAssetPersistence.getObjectSchemas()
		).thenReturn(
			new JSONArray(
			).put(
				new JSONObject(
				).put(
					"id", "1"
				).put(
					"name", "Business Events"
				)
			)
		);

		Mockito.when(
			_jiraAssetPersistence.getObjectTypes("1")
		).thenReturn(
			new JSONArray()
		);

		for (int i = 0; i < 2; i++) {
			jiraAssetSchemaLoader.getAttributeIds("10");
			jiraAssetSchemaLoader.getAttributeOptions("10");
			jiraAssetSchemaLoader.getObjectTypeIds("Business Events");
		}

		_verifySchemaFetches(1);

		_jiraBusinessEventService.scheduledAssetObjectsCacheEviction();

		jiraAssetSchemaLoader.getAttributeIds("10");
		jiraAssetSchemaLoader.getAttributeOptions("10");
		jiraAssetSchemaLoader.getObjectTypeIds("Business Events");

		_verifySchemaFetches(2);
	}

	@Test
	public void testScheduledAssetObjectsCacheEvictionForcesRefetch()
		throws Exception {

		_jiraBusinessEventService.getFieldOptions("status");
		_jiraBusinessEventService.getJiraProductVersions();

		_jiraBusinessEventService.getFieldOptions("status");
		_jiraBusinessEventService.getJiraProductVersions();

		_verifyFetches(1);

		_jiraBusinessEventService.scheduledAssetObjectsCacheEviction();

		_jiraBusinessEventService.getFieldOptions("status");
		_jiraBusinessEventService.getJiraProductVersions();

		_verifyFetches(2);
	}

	@Test
	public void testScheduledAssetObjectsCacheEvictionIsIdempotent()
		throws Exception {

		_jiraBusinessEventService.scheduledAssetObjectsCacheEviction();
		_jiraBusinessEventService.scheduledAssetObjectsCacheEviction();

		_jiraBusinessEventService.getJiraProductVersions();

		_jiraBusinessEventService.scheduledAssetObjectsCacheEviction();
		_jiraBusinessEventService.scheduledAssetObjectsCacheEviction();

		_jiraBusinessEventService.getJiraProductVersions();

		Mockito.verify(
			_jiraAssetPersistence, Mockito.times(2)
		).searchObjects(
			ArgumentMatchers.anyString(), ArgumentMatchers.any()
		);
	}

	private <T> T _createCachingProxy(T target) {
		CacheInterceptor cacheInterceptor = new CacheInterceptor();

		cacheInterceptor.setCacheManager(_concurrentMapCacheManager);
		cacheInterceptor.setCacheOperationSource(
			new AnnotationCacheOperationSource());

		cacheInterceptor.afterPropertiesSet();
		cacheInterceptor.afterSingletonsInstantiated();

		ProxyFactory proxyFactory = new ProxyFactory(target);

		proxyFactory.addAdvice(cacheInterceptor);
		proxyFactory.setProxyTargetClass(true);

		return (T)proxyFactory.getProxy();
	}

	private void _verifyFetches(int times) {
		Mockito.verify(
			_jiraAssetPersistence, Mockito.times(times)
		).getObjectTypeAttributes(
			ArgumentMatchers.any()
		);

		Mockito.verify(
			_jiraAssetPersistence, Mockito.times(times)
		).searchObjects(
			ArgumentMatchers.anyString(), ArgumentMatchers.any()
		);
	}

	private void _verifySchemaFetches(int times) {
		Mockito.verify(
			_jiraAssetPersistence, Mockito.times(times * 2)
		).getObjectTypeAttributes(
			"10"
		);

		Mockito.verify(
			_jiraAssetPersistence, Mockito.times(times)
		).getObjectSchemas();

		Mockito.verify(
			_jiraAssetPersistence, Mockito.times(times)
		).getObjectTypes(
			"1"
		);
	}

	private final ConcurrentMapCacheManager _concurrentMapCacheManager =
		new ConcurrentMapCacheManager();
	private JiraAssetPersistence _jiraAssetPersistence;
	private JiraBusinessEventService _jiraBusinessEventService;

}