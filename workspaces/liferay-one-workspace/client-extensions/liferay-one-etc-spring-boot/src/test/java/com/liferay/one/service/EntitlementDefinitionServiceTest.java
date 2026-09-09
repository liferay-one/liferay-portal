/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Category;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.constants.TaxonomyCategoryConstants;
import com.liferay.one.exception.NoSuchProductException;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.portal.kernel.util.StringUtil;

import java.net.URI;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Veloso
 */
public class EntitlementDefinitionServiceTest {

	@BeforeEach
	public void setUp() {
		_entitlementDefinitionService = new TestEntitlementDefinitionService();

		ReflectionTestUtils.setField(
			_entitlementDefinitionService, "_commerceProductService",
			_commerceProductService);
		ReflectionTestUtils.setField(
			_entitlementDefinitionService, "_commerceSkuService",
			_commerceSkuService);
	}

	@Test
	public void testGenerateEntitlementDefinitionCreatesDefinitionPerSku()
		throws Exception {

		_setUpAppProduct(
			_createSku("SKU-LARGE", true, "Large"),
			_createSku("SKU-SMALL", true, "Small"));

		_entitlementDefinitionService.generateEntitlementDefinition(
			_C_PRODUCT_ID);

		Assertions.assertEquals(
			Arrays.asList("SKU-LARGE", "SKU-SMALL"),
			_getExternalReferenceCodes(_entitlementDefinitionService.putURIs));

		JSONObject jsonObject = new JSONObject(
			_entitlementDefinitionService.putBodies.get(0));

		Assertions.assertTrue(jsonObject.getBoolean("active"));
		Assertions.assertEquals(1, jsonObject.getInt("defaultQuantity"));
		Assertions.assertEquals(
			"Test App - Large", jsonObject.getString("name"));
		Assertions.assertFalse(jsonObject.has("productOptions"));
		Assertions.assertEquals(
			"SKU-LARGE", jsonObject.getString("skuExternalReferenceCode"));
	}

	@Test
	public void testGenerateEntitlementDefinitionDeactivatesDefinitionDespiteManualDefinition()
		throws Exception {

		_setUpAppProduct(_createSku("SKU-LARGE", false, "Large"));
		_setUpExistingEntitlementDefinitions(
			_createEntitlementDefinitionJSONObject(
				true, "MANUAL", "Manual", "SKU-LARGE"),
			_createEntitlementDefinitionJSONObject(
				true, "SKU-LARGE", "Test App Large", "SKU-LARGE"));

		_entitlementDefinitionService.generateEntitlementDefinition(
			_C_PRODUCT_ID);

		Assertions.assertTrue(
			_entitlementDefinitionService.putBodies.isEmpty());
		Assertions.assertEquals(
			List.of("SKU-LARGE"),
			_getExternalReferenceCodes(
				_entitlementDefinitionService.patchURIs));

		JSONObject jsonObject = new JSONObject(
			_entitlementDefinitionService.patchBodies.get(0));

		Assertions.assertFalse(jsonObject.getBoolean("active"));
	}

	@Test
	public void testGenerateEntitlementDefinitionDeactivatesDefinitionForUnpublishedSku()
		throws Exception {

		_setUpAppProduct(
			_createSku("SKU-LARGE", false, "Large"),
			_createSku("SKU-SMALL", true, "Small"));
		_setUpExistingEntitlementDefinitions(
			_createEntitlementDefinitionJSONObject(
				true, "SKU-LARGE", "Test App Large", "SKU-LARGE"),
			_createEntitlementDefinitionJSONObject(
				true, "SKU-SMALL", "Test App Small", "SKU-SMALL"));

		_entitlementDefinitionService.generateEntitlementDefinition(
			_C_PRODUCT_ID);

		Assertions.assertTrue(
			_entitlementDefinitionService.putBodies.isEmpty());
		Assertions.assertEquals(
			List.of("SKU-LARGE"),
			_getExternalReferenceCodes(
				_entitlementDefinitionService.patchURIs));

		JSONObject jsonObject = new JSONObject(
			_entitlementDefinitionService.patchBodies.get(0));

		Assertions.assertFalse(jsonObject.getBoolean("active"));
	}

	@Test
	public void testGenerateEntitlementDefinitionEscapesSkuExternalReferenceCode()
		throws Exception {

		_setUpAppProduct(_createSku("SKU-O'BRIEN", true, "OBrien"));

		_entitlementDefinitionService.generateEntitlementDefinition(
			_C_PRODUCT_ID);

		boolean escaped = false;

		for (String uri : _entitlementDefinitionService.getURIs) {
			if (uri.contains("SKU-O''BRIEN")) {
				escaped = true;
			}
		}

		Assertions.assertTrue(escaped);
		Assertions.assertEquals(
			1, _entitlementDefinitionService.putURIs.size());
	}

	@Test
	public void testGenerateEntitlementDefinitionPropagatesMissingProduct()
		throws Exception {

		Mockito.when(
			_commerceProductService.getProduct(_C_PRODUCT_ID)
		).thenThrow(
			new NoSuchProductException(
				"No product exists for commerce product ID " + _C_PRODUCT_ID)
		);

		Assertions.assertThrows(
			NoSuchProductException.class,
			() -> _entitlementDefinitionService.generateEntitlementDefinition(
				_C_PRODUCT_ID));

		Mockito.verifyNoInteractions(_commerceSkuService);

		Assertions.assertTrue(
			_entitlementDefinitionService.putBodies.isEmpty());
	}

	@Test
	public void testGenerateEntitlementDefinitionReactivatesDefinitionForRepublishedSku()
		throws Exception {

		_setUpAppProduct(_createSku("SKU-SMALL", true, "Small"));
		_setUpExistingEntitlementDefinitions(
			_createEntitlementDefinitionJSONObject(
				false, "SKU-SMALL", "Old Name", "SKU-SMALL"));

		_entitlementDefinitionService.generateEntitlementDefinition(
			_C_PRODUCT_ID);

		Assertions.assertTrue(
			_entitlementDefinitionService.putBodies.isEmpty());
		Assertions.assertEquals(
			List.of("SKU-SMALL"),
			_getExternalReferenceCodes(
				_entitlementDefinitionService.patchURIs));

		JSONObject jsonObject = new JSONObject(
			_entitlementDefinitionService.patchBodies.get(0));

		Assertions.assertTrue(jsonObject.getBoolean("active"));
		Assertions.assertEquals(
			"Test App - Small", jsonObject.getString("name"));
	}

	@Test
	public void testGenerateEntitlementDefinitionSkipsProductWithoutAppCategory()
		throws Exception {

		Mockito.when(
			_commerceProductService.getProduct(_C_PRODUCT_ID)
		).thenReturn(
			_createProduct(
				"MARKETPLACE_PRODUCT_TYPE_SOLUTION", "Test App",
				ProductSpecificationConstants.TYPES_LICENSE_KEY_GENERATING[0])
		);

		_entitlementDefinitionService.generateEntitlementDefinition(
			_C_PRODUCT_ID);

		Mockito.verifyNoInteractions(_commerceSkuService);

		Assertions.assertTrue(
			_entitlementDefinitionService.putBodies.isEmpty());
	}

	@Test
	public void testGenerateEntitlementDefinitionSkipsProductWithoutLicenseType()
		throws Exception {

		Mockito.when(
			_commerceProductService.getProduct(_C_PRODUCT_ID)
		).thenReturn(
			_createProduct(
				TaxonomyCategoryConstants.EXTERNAL_REFERENCE_CODE_APP,
				"Test App", "theme")
		);

		_entitlementDefinitionService.generateEntitlementDefinition(
			_C_PRODUCT_ID);

		Mockito.verifyNoInteractions(_commerceSkuService);

		Assertions.assertTrue(
			_entitlementDefinitionService.putBodies.isEmpty());
	}

	@Test
	public void testGenerateEntitlementDefinitionSkipsProductWithoutSkus()
		throws Exception {

		_setUpAppProduct();

		_entitlementDefinitionService.generateEntitlementDefinition(
			_C_PRODUCT_ID);

		Assertions.assertTrue(
			_entitlementDefinitionService.putBodies.isEmpty());
		Assertions.assertTrue(
			_entitlementDefinitionService.patchBodies.isEmpty());
	}

	@Test
	public void testGenerateEntitlementDefinitionSkipsSkuWithManualDefinition()
		throws Exception {

		_setUpAppProduct(
			_createSku("SKU-LARGE", true, "Large"),
			_createSku("SKU-SMALL", true, "Small"));
		_setUpExistingEntitlementDefinitions(
			_createEntitlementDefinitionJSONObject(
				true, "MANUAL", "Manual", "SKU-LARGE"));

		_entitlementDefinitionService.generateEntitlementDefinition(
			_C_PRODUCT_ID);

		Assertions.assertEquals(
			List.of("SKU-SMALL"),
			_getExternalReferenceCodes(_entitlementDefinitionService.putURIs));
		Assertions.assertTrue(
			_entitlementDefinitionService.patchBodies.isEmpty());
	}

	@Test
	public void testGenerateEntitlementDefinitionSkipsSkuWithoutExternalReferenceCode()
		throws Exception {

		_setUpAppProduct(
			_createSku(null, true, "Large"),
			_createSku("SKU-SMALL", true, "Small"));

		_entitlementDefinitionService.generateEntitlementDefinition(
			_C_PRODUCT_ID);

		Assertions.assertEquals(
			List.of("SKU-SMALL"),
			_getExternalReferenceCodes(_entitlementDefinitionService.putURIs));
	}

	@Test
	public void testGenerateEntitlementDefinitionSkipsUnpublishedSkuWithoutDefinition()
		throws Exception {

		_setUpAppProduct(_createSku("SKU-SMALL", false, "Small"));

		_entitlementDefinitionService.generateEntitlementDefinition(
			_C_PRODUCT_ID);

		Assertions.assertTrue(
			_entitlementDefinitionService.putBodies.isEmpty());
		Assertions.assertTrue(
			_entitlementDefinitionService.patchBodies.isEmpty());
	}

	@Test
	public void testGetEntitlementDefinitionsFiltersByProductOptions()
		throws Exception {

		JSONObject largeJSONObject = _createEntitlementDefinitionJSONObject(
			true, "DEF-LARGE", "Test App Large", "SKU-1");

		largeJSONObject.put(
			"productOptions",
			String.valueOf(
				new JSONObject(
				).put(
					"machinetype", "large"
				)));

		JSONObject smallJSONObject = _createEntitlementDefinitionJSONObject(
			true, "DEF-SMALL", "Test App Small", "SKU-1");

		smallJSONObject.put(
			"productOptions",
			String.valueOf(
				new JSONObject(
				).put(
					"machinetype", "small"
				)));

		_setUpExistingEntitlementDefinitions(largeJSONObject, smallJSONObject);

		List<EntitlementDefinition> entitlementDefinitions =
			_entitlementDefinitionService.getEntitlementDefinitions(
				null, Map.of("machinetype", "small"));

		Assertions.assertEquals(1, entitlementDefinitions.size());

		EntitlementDefinition entitlementDefinition =
			entitlementDefinitions.get(0);

		Assertions.assertEquals(
			"DEF-SMALL", entitlementDefinition.getExternalReferenceCode());
	}

	private JSONObject _createEntitlementDefinitionJSONObject(
		boolean active, String externalReferenceCode, String name,
		String skuExternalReferenceCode) {

		return new JSONObject(
		).put(
			"active", active
		).put(
			"externalReferenceCode", externalReferenceCode
		).put(
			"id", ++_entitlementDefinitionId
		).put(
			"name", name
		).put(
			"skuExternalReferenceCode", skuExternalReferenceCode
		);
	}

	private Product _createProduct(
		String categoryExternalReferenceCode, String name, String type) {

		Product product = new Product();

		Category category = new Category();

		category.setExternalReferenceCode(categoryExternalReferenceCode);

		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setSpecificationKey(
			ProductSpecificationConstants.KEY_TYPE);
		productSpecification.setValue(Map.of("en_US", type));

		product.setCategories(new Category[] {category});
		product.setName(Map.of("en_US", name));
		product.setProductSpecifications(
			new ProductSpecification[] {productSpecification});

		return product;
	}

	private Sku _createSku(
		String externalReferenceCode, boolean published, String sku) {

		Sku skuDTO = new Sku();

		skuDTO.setExternalReferenceCode(externalReferenceCode);
		skuDTO.setPublished(published);
		skuDTO.setSku(sku);

		return skuDTO;
	}

	private List<String> _getExternalReferenceCodes(List<String> uris) {
		List<String> externalReferenceCodes = new ArrayList<>();

		for (String uri : uris) {
			externalReferenceCodes.add(uri.substring(uri.lastIndexOf('/') + 1));
		}

		return externalReferenceCodes;
	}

	private void _setUpAppProduct(Sku... skus) throws Exception {
		Mockito.when(
			_commerceProductService.getProduct(_C_PRODUCT_ID)
		).thenReturn(
			_createProduct(
				TaxonomyCategoryConstants.EXTERNAL_REFERENCE_CODE_APP,
				"Test App",
				ProductSpecificationConstants.TYPES_LICENSE_KEY_GENERATING[0])
		);

		Mockito.when(
			_commerceSkuService.getSkus(_C_PRODUCT_ID)
		).thenReturn(
			Arrays.asList(skus)
		);
	}

	private void _setUpExistingEntitlementDefinitions(
		JSONObject... entitlementDefinitionJSONObjects) {

		JSONArray itemsJSONArray = new JSONArray();

		for (JSONObject entitlementDefinitionJSONObject :
				entitlementDefinitionJSONObjects) {

			itemsJSONArray.put(entitlementDefinitionJSONObject);
		}

		_entitlementDefinitionService.itemsJSONArray = itemsJSONArray;
	}

	private static final long _C_PRODUCT_ID = 3000L;

	private final CommerceProductService _commerceProductService = Mockito.mock(
		CommerceProductService.class);
	private final CommerceSkuService _commerceSkuService = Mockito.mock(
		CommerceSkuService.class);
	private long _entitlementDefinitionId;
	private TestEntitlementDefinitionService _entitlementDefinitionService;

	private static class TestEntitlementDefinitionService
		extends EntitlementDefinitionService {

		public final List<String> getURIs = new ArrayList<>();
		public JSONArray itemsJSONArray = new JSONArray();
		public final List<String> patchBodies = new ArrayList<>();
		public final List<String> patchURIs = new ArrayList<>();
		public final List<String> putBodies = new ArrayList<>();
		public final List<String> putURIs = new ArrayList<>();

		@Override
		protected String get(String authorization, URI uri) {
			getURIs.add(uri.toString());

			JSONObject jsonObject = new JSONObject(
			).put(
				"items", _filterItemsJSONArray(uri.getQuery())
			);

			return jsonObject.toString();
		}

		@Override
		protected String getAuthorization() {
			return "";
		}

		@Override
		protected String getAuthorization(Jwt jwt) {
			return "";
		}

		@Override
		protected String patch(String authorization, String body, URI uri) {
			patchBodies.add(body);
			patchURIs.add(uri.toString());

			return null;
		}

		@Override
		protected String put(String authorization, String body, URI uri) {
			putBodies.add(body);
			putURIs.add(uri.toString());

			return null;
		}

		private JSONArray _filterItemsJSONArray(String query) {
			String externalReferenceCode = _getExternalReferenceCodeFilterValue(
				query);

			if (externalReferenceCode != null) {
				JSONArray filteredItemsJSONArray = new JSONArray();

				for (int i = 0; i < itemsJSONArray.length(); i++) {
					JSONObject jsonObject = itemsJSONArray.getJSONObject(i);

					if (externalReferenceCode.equals(
							jsonObject.optString("externalReferenceCode"))) {

						filteredItemsJSONArray.put(jsonObject);
					}
				}

				return filteredItemsJSONArray;
			}

			Set<String> skuExternalReferenceCodes = _getFilterValues(query);

			if (skuExternalReferenceCodes == null) {
				return itemsJSONArray;
			}

			JSONArray filteredItemsJSONArray = new JSONArray();

			for (int i = 0; i < itemsJSONArray.length(); i++) {
				JSONObject jsonObject = itemsJSONArray.getJSONObject(i);

				if (skuExternalReferenceCodes.contains(
						jsonObject.optString("skuExternalReferenceCode"))) {

					filteredItemsJSONArray.put(jsonObject);
				}
			}

			return filteredItemsJSONArray;
		}

		private String _getExternalReferenceCodeFilterValue(String query) {
			if (query == null) {
				return null;
			}

			String prefix = "filter=externalReferenceCode eq '";

			int index = query.indexOf(prefix);

			if (index < 0) {
				return null;
			}

			int startIndex = index + prefix.length();

			return query.substring(startIndex, query.indexOf('\'', startIndex));
		}

		private Set<String> _getFilterValues(String query) {
			if (query == null) {
				return null;
			}

			String prefix = "skuExternalReferenceCode in (";

			int index = query.indexOf(prefix);

			if (index < 0) {
				return null;
			}

			int startIndex = index + prefix.length();

			String values = query.substring(
				startIndex, query.indexOf(')', startIndex));

			Set<String> skuExternalReferenceCodes = new HashSet<>();

			for (String value : values.split(",")) {
				String skuExternalReferenceCode = StringUtil.removeSubstring(
					value, "'");

				skuExternalReferenceCodes.add(skuExternalReferenceCode.trim());
			}

			return skuExternalReferenceCodes;
		}

	}

}