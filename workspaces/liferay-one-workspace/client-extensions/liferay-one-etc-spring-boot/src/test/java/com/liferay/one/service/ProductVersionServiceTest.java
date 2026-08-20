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
	public void testGetProductVersionsFilter() throws Exception {
		_productVersionService.getProductVersions("dxp");

		Assertions.assertEquals(
			"(productGroup eq 'dxp') and (versionLevel eq 'major')",
			_filterCaptor.getValue());
	}

	@Test
	public void testGetProductVersionsSupportedFilter() throws Exception {
		_productVersionService.getProductVersions("dxp", true);

		Assertions.assertEquals(
			"(productGroup eq 'dxp') and (supported eq true) and " +
				"(versionLevel eq 'major')",
			_filterCaptor.getValue());
	}

	@Test
	public void testSyncProductVersions() throws Exception {
		Map<String, JSONObject> jsonObjects = _syncProductVersions(
			_releasesJSON());

		Assertions.assertEquals(5, jsonObjects.size());

		_assertProductVersion(
			jsonObjects.get("DXP 2026.Q2"), "2026.Q2", true, "quarterly",
			"major");
		_assertProductVersion(
			jsonObjects.get("DXP 2026.Q2.1"), "2026.Q2", false, "quarterly",
			"patch");
		_assertProductVersion(
			jsonObjects.get("DXP 2026.Q2.2"), "2026.Q2", true, "quarterly",
			"patch");
		_assertProductVersion(
			jsonObjects.get("DXP 7.4"), "7.4", false, null, "major");
		_assertProductVersion(
			jsonObjects.get("DXP 7.4 U112"), "7.4", false, "update", "patch");
	}

	@Test
	public void testSyncProductVersionsTypes() throws Exception {
		JSONArray jsonArray = new JSONArray();

		jsonArray.put(_releaseJSONObject("7.0", null, "DXP 7.0 DE10", false));
		jsonArray.put(_releaseJSONObject("7.2", null, "DXP 7.2 FP1", false));
		jsonArray.put(_releaseJSONObject("7.1", null, "DXP 7.1 GA1", false));
		jsonArray.put(_releaseJSONObject("7.3", null, "DXP 7.3 SP5", false));
		jsonArray.put(
			_releaseJSONObject(
				"2026.q1", "DXP 2026.Q1 LTS", "DXP 2026.Q1.12 LTS", true));

		Map<String, JSONObject> jsonObjects = _syncProductVersions(
			jsonArray.toString());

		Assertions.assertEquals(
			"digitalEnterprise", _getTypeKey(jsonObjects.get("DXP 7.0 DE10")));
		Assertions.assertEquals(
			"fixPack", _getTypeKey(jsonObjects.get("DXP 7.2 FP1")));
		Assertions.assertEquals(
			"generalAvailability", _getTypeKey(jsonObjects.get("DXP 7.1 GA1")));
		Assertions.assertEquals(
			"servicePack", _getTypeKey(jsonObjects.get("DXP 7.3 SP5")));
		Assertions.assertEquals(
			"quarterly", _getTypeKey(jsonObjects.get("DXP 2026.Q1.12 LTS")));
		Assertions.assertEquals(
			"quarterly", _getTypeKey(jsonObjects.get("DXP 2026.Q1 LTS")));
	}

	private void _assertProductVersion(
		JSONObject jsonObject, String productGroupVersion, boolean supported,
		String type, String versionLevel) {

		Assertions.assertNotNull(jsonObject);

		Assertions.assertEquals("dxp", jsonObject.getString("productGroup"));
		Assertions.assertEquals(
			jsonObject.getString("externalReferenceCode"),
			jsonObject.getString("productVersion"));
		Assertions.assertEquals(
			productGroupVersion, jsonObject.getString("productGroupVersion"));
		Assertions.assertEquals(supported, jsonObject.getBoolean("supported"));
		Assertions.assertEquals(type, _getTypeKey(jsonObject));

		JSONObject versionLevelJSONObject = jsonObject.getJSONObject(
			"versionLevel");

		Assertions.assertEquals(
			versionLevel, versionLevelJSONObject.getString("key"));
	}

	private String _getTypeKey(JSONObject jsonObject) {
		JSONObject typeJSONObject = jsonObject.optJSONObject("type");

		if (typeJSONObject == null) {
			return null;
		}

		return typeJSONObject.getString("key");
	}

	private JSONObject _releaseJSONObject(
		String productGroupVersion, String productMajorVersion,
		String productVersion, boolean supported) {

		JSONArray tagsJSONArray = new JSONArray();

		if (supported) {
			tagsJSONArray.put("supported");
		}

		JSONObject jsonObject = new JSONObject(
		).put(
			"product", "dxp"
		).put(
			"productGroupVersion", productGroupVersion
		).put(
			"productVersion", productVersion
		).put(
			"tags", tagsJSONArray
		);

		if (productMajorVersion != null) {
			jsonObject.put("productMajorVersion", productMajorVersion);
		}

		return jsonObject;
	}

	private String _releasesJSON() {
		JSONArray jsonArray = new JSONArray();

		jsonArray.put(
			_releaseJSONObject(
				"2026.q2", "DXP 2026.Q2", "DXP 2026.Q2.1", false));
		jsonArray.put(
			_releaseJSONObject(
				"2026.q2", "DXP 2026.Q2", "DXP 2026.Q2.2", true));
		jsonArray.put(_releaseJSONObject("7.4", null, "DXP 7.4 U112", false));
		jsonArray.put(
			new JSONObject(
			).put(
				"product", "portal"
			).put(
				"productGroupVersion", "7.4"
			).put(
				"productVersion", "Portal 7.4 GA1"
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
					).put(
						"versionLevel",
						new JSONObject(
						).put(
							"key", "major"
						)
					)));
		}

		return productVersions;
	}

	private Map<String, JSONObject> _syncProductVersions(String releasesJSON)
		throws Exception {

		TestProductVersionService testProductVersionService =
			new TestProductVersionService();

		testProductVersionService.releasesResponse = releasesJSON;

		ReflectionTestUtils.setField(
			testProductVersionService, "_productGroups", new String[] {"dxp"});
		ReflectionTestUtils.setField(
			testProductVersionService, "_releasesURL",
			"https://releases.example.com/releases.json");

		testProductVersionService.syncProductVersions();

		Map<String, JSONObject> jsonObjects = new HashMap<>();

		for (String body : testProductVersionService.putBodies) {
			JSONObject jsonObject = new JSONObject(body);

			jsonObjects.put(jsonObject.getString("productVersion"), jsonObject);
		}

		return jsonObjects;
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