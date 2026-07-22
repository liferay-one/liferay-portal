/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.model.ProductVersion;

import java.net.URI;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Allen Ziegenfus
 */
public class ProductVersionServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_productVersionService = Mockito.spy(new ProductVersionService());

		_filterCaptor = ArgumentCaptor.forClass(String.class);

		Mockito.doAnswer(
			invocation -> {
				Function<JSONObject, ProductVersion> mapper =
					invocation.getArgument(2);

				return _stubbedItems(mapper);
			}
		).when(
			_productVersionService
		).getAllItems(
			Mockito.eq("/o/c/productversions"), _filterCaptor.capture(),
			Mockito.any()
		);
	}

	@Test
	public void testGetLatestProductGroupVersion() throws Exception {
		_stubbedProductVersions = Arrays.asList(
			new String[] {"DXP 7.4", "7.4"},
			new String[] {"DXP 2025.Q3", "2025.Q3"},
			new String[] {"DXP 2026.Q2", "2026.Q2"},
			new String[] {"DXP 2024.Q1", "2024.Q1"},
			new String[] {"DXP 2026.Q1 LTS", "2026.Q1"},
			new String[] {"DXP 2025.Q1 LTS", "2025.Q1"},
			new String[] {"DXP 2025.Q4", "2025.Q4"});

		Assertions.assertEquals(
			"2026.Q2",
			_productVersionService.getLatestProductGroupVersion("dxp"));
	}

	@Test
	public void testGetProductVersionFilter() throws Exception {
		_productVersionService.getProductVersion("dxp", "DXP 2026.Q2");

		Assertions.assertEquals(
			"(productGroup eq 'dxp') and (productVersion eq 'DXP 2026.Q2')",
			_filterCaptor.getValue());
	}

	@Test
	public void testGetProductVersionsSupportedFilter() throws Exception {
		_productVersionService.getProductVersions("dxp", true);

		Assertions.assertEquals(
			"(productGroup eq 'dxp') and (supported eq true)",
			_filterCaptor.getValue());
	}

	@Test
	public void testSyncProductVersions() throws Exception {
		TestProductVersionService testProductVersionService =
			new TestProductVersionService();

		testProductVersionService.releasesResponse = _releasesJSON();

		ReflectionTestUtils.setField(
			testProductVersionService, "_productGroups", new String[] {"dxp"});
		ReflectionTestUtils.setField(
			testProductVersionService, "_releasesURL",
			"https://releases.example.com/releases.json");

		testProductVersionService.syncProductVersions();

		List<String> bodies = testProductVersionService.putBodies;

		Assertions.assertEquals(2, bodies.size());

		Map<String, Boolean> supportedByVersion = new HashMap<>();
		Map<String, String> productGroupVersionByVersion = new HashMap<>();

		for (String body : bodies) {
			JSONObject jsonObject = new JSONObject(body);

			Assertions.assertEquals(
				"dxp", jsonObject.getString("productGroup"));
			Assertions.assertEquals(
				jsonObject.getString("externalReferenceCode"),
				jsonObject.getString("productVersion"));

			productGroupVersionByVersion.put(
				jsonObject.getString("productVersion"),
				jsonObject.getString("productGroupVersion"));
			supportedByVersion.put(
				jsonObject.getString("productVersion"),
				jsonObject.getBoolean("supported"));
		}

		Assertions.assertEquals(
			Boolean.TRUE, supportedByVersion.get("DXP 2026.Q2"));
		Assertions.assertEquals(
			Boolean.FALSE, supportedByVersion.get("DXP 7.4"));
		Assertions.assertEquals(
			"2026.Q2", productGroupVersionByVersion.get("DXP 2026.Q2"));
		Assertions.assertEquals(
			"7.4", productGroupVersionByVersion.get("DXP 7.4"));
	}

	private String _releasesJSON() {
		JSONArray jsonArray = new JSONArray();

		jsonArray.put(
			new JSONObject(
			).put(
				"product", "dxp"
			).put(
				"productGroupVersion", "2026.q2"
			).put(
				"productMajorVersion", "DXP 2026.Q2"
			).put(
				"tags", new JSONArray()
			));
		jsonArray.put(
			new JSONObject(
			).put(
				"product", "dxp"
			).put(
				"productGroupVersion", "2026.q2"
			).put(
				"productMajorVersion", "DXP 2026.Q2"
			).put(
				"tags",
				new JSONArray(
				).put(
					"supported"
				)
			));
		jsonArray.put(
			new JSONObject(
			).put(
				"product", "dxp"
			).put(
				"productGroupVersion", "7.4"
			).put(
				"tags", new JSONArray()
			));
		jsonArray.put(
			new JSONObject(
			).put(
				"product", "portal"
			).put(
				"productGroupVersion", "7.4"
			).put(
				"tags",
				new JSONArray(
				).put(
					"supported"
				)
			));
		jsonArray.put(
			new JSONObject(
			).put(
				"product", "dxp"
			).put(
				"tags",
				new JSONArray(
				).put(
					"supported"
				)
			));

		return jsonArray.toString();
	}

	private List<ProductVersion> _stubbedItems(
		Function<JSONObject, ProductVersion> mapper) {

		List<ProductVersion> productVersions = new ArrayList<>();

		for (String[] productVersion : _stubbedProductVersions) {
			productVersions.add(
				mapper.apply(
					new JSONObject(
					).put(
						"id", 1
					).put(
						"productGroup", "dxp"
					).put(
						"productGroupVersion", productVersion[1]
					).put(
						"productVersion", productVersion[0]
					).put(
						"supported", true
					)));
		}

		return productVersions;
	}

	private ArgumentCaptor<String> _filterCaptor;
	private ProductVersionService _productVersionService;
	private List<String[]> _stubbedProductVersions = Collections.emptyList();

	private static class TestProductVersionService
		extends ProductVersionService {

		public final List<String> putBodies = new ArrayList<>();
		public String releasesResponse;

		@Override
		protected String get(String authorization, URI uri) {
			if (authorization.isEmpty()) {
				return releasesResponse;
			}

			return "{}";
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

}