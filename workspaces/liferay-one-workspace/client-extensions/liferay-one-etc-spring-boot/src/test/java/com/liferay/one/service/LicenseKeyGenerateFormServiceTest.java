/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.SkuOption;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.license.LicenseEntry;
import com.liferay.one.license.LicenseEntryService;
import com.liferay.one.license.LicenseKeyType;
import com.liferay.one.license.LicenseKeyTypeService;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.ProductVersion;
import com.liferay.one.model.Project;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.time.Year;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Pedro Oliveira
 */
@DisplayName(
	"[SVC-LICENSEKEYGENERATEFORMSERVICE] LicenseKeyGenerateFormService"
)
public class LicenseKeyGenerateFormServiceTest {

	@Test
	public void testGetCloudNativeKeyTypesKeepsOnlyCloudNative() {

		// The activation key list stamps a Cloud Native environment row with
		// the dates of the key type matching its environment type, so the
		// summary carries one entry per Cloud Native key type and nothing from
		// any other product.

		JSONArray jsonArray = ReflectionTestUtils.invokeMethod(
			new LicenseKeyGenerateFormService(),
			"_getCloudNativeKeyTypesJSONArray",
			_toGenerateFormJSONObject(
				_toProductJSONObject(
					"PRDCT-CLOUD-NATIVE",
					_toKeyTypeJSONObject(
						"production", 1, "2026-12-31T00:00:00Z",
						"2026-01-01T00:00:00Z"),
					_toKeyTypeJSONObject(
						"uat", 1, "2026-06-30T00:00:00Z",
						"2026-02-01T00:00:00Z")),
				_toProductJSONObject(
					"PRDCT-DXP",
					_toKeyTypeJSONObject(
						"production", 1, "2027-12-31T00:00:00Z",
						"2027-01-01T00:00:00Z"))));

		Assertions.assertEquals(2, jsonArray.length());

		JSONObject jsonObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals("production", jsonObject.getString("key"));
		Assertions.assertEquals(
			"2026-01-01T00:00:00Z", jsonObject.getString("startDate"));
		Assertions.assertEquals(
			"2026-12-31T00:00:00Z", jsonObject.getString("endDate"));

		Assertions.assertEquals(
			"uat",
			jsonArray.getJSONObject(
				1
			).getString(
				"key"
			));
	}

	@Test
	public void testGetEntitledProductsReadsEverySoldSku() throws Exception {
		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			_toLicenseKeyGenerateFormService(
				"PRDCT-CONTENT-MARKETING",
				HashMapBuilder.put(
					"PRDCT-CONTENT-MARKETING", _toSku(1L, null)
				).put(
					"PRDCT-CONTENT-MARKETING-DEVELOPER",
					_toSku(1L, "cmp-license-usage-type")
				).build());

		List<Entitlement> entitlements = Arrays.asList(
			_toLicenseGenerationEntitlement(
				1L, false, "CMP", null, "PRDCT-CONTENT-MARKETING"),
			_toLicenseGenerationEntitlement(
				2L, false, "CMP", "developer",
				"PRDCT-CONTENT-MARKETING-DEVELOPER"));

		List<Object> entitledProducts = _getEntitledProducts(
			entitlements, licenseKeyGenerateFormService);

		Assertions.assertEquals(1, entitledProducts.size());

		boolean generatesActivationKey = ReflectionTestUtils.invokeMethod(
			entitledProducts.get(0), "isGeneratesActivationKey");

		Assertions.assertTrue(generatesActivationKey);
	}

	@Test
	public void testGetEntitledProductsReadsTheLicenseKeyFamily()
		throws Exception {

		// The license entry family is what the generate form groups a
		// product's key types under, and it travels with the SKU that was
		// sold rather than with the product the SKU belongs to.

		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			_toLicenseKeyGenerateFormService(
				"PRDCT-DXP",
				HashMapBuilder.put(
					"PRDCT-DXP", _toSku(1L, null)
				).build());

		List<Entitlement> entitlements = Collections.singletonList(
			_toLicenseGenerationEntitlement(
				1L, true, "DXP", null, "PRDCT-DXP"));

		List<Object> entitledProducts = _getEntitledProducts(
			entitlements, licenseKeyGenerateFormService);

		Assertions.assertEquals(1, entitledProducts.size());

		String licenseKeyFamily = ReflectionTestUtils.invokeMethod(
			entitledProducts.get(0), "getLicenseKeyFamily");

		Assertions.assertEquals("DXP", licenseKeyFamily);

		boolean generatesActivationKey = ReflectionTestUtils.invokeMethod(
			entitledProducts.get(0), "isGeneratesActivationKey");

		Assertions.assertTrue(generatesActivationKey);
	}

	@Test
	public void testGetEntitledProductsWithoutAnActivationKey()
		throws Exception {

		// A SKU carrying no license usage type option leads an activation key
		// only where its entitlement definition says so, which is what keeps
		// the cloud products out of the bundle.

		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			_toLicenseKeyGenerateFormService(
				"PRDCT-CLOUD-NATIVE",
				HashMapBuilder.put(
					"PRDCT-CLOUD-NATIVE", _toSku(1L, null)
				).build());

		List<Entitlement> entitlements = Collections.singletonList(
			_toLicenseGenerationEntitlement(
				1L, false, "Cloud Native", null, "PRDCT-CLOUD-NATIVE"));

		List<Object> entitledProducts = _getEntitledProducts(
			entitlements, licenseKeyGenerateFormService);

		Assertions.assertEquals(1, entitledProducts.size());

		boolean generatesActivationKey = ReflectionTestUtils.invokeMethod(
			entitledProducts.get(0), "isGeneratesActivationKey");

		Assertions.assertFalse(generatesActivationKey);
	}

	@Test
	public void testGetKeyTypesKeepsASpentKeyType() {
		LicenseKeyTypeService licenseKeyTypeService = Mockito.mock(
			LicenseKeyTypeService.class);

		Mockito.when(
			licenseKeyTypeService.getLicenseKeyTypes()
		).thenReturn(
			Collections.singletonList(LicenseKeyType.PRODUCTION)
		);

		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			new LicenseKeyGenerateFormService();

		ReflectionTestUtils.setField(
			licenseKeyGenerateFormService, "_licenseKeyTypeService",
			licenseKeyTypeService);

		Entitlement entitlement = _toEntitlement(5.0);

		Map<String, Map<String, Entitlement>> licenseKeyTypeEntitlements =
			HashMapBuilder.<String, Map<String, Entitlement>>put(
				"DXP",
				(Map<String, Entitlement>)HashMapBuilder.put(
					"production", entitlement
				).build()
			).build();

		JSONArray jsonArray = ReflectionTestUtils.invokeMethod(
			licenseKeyGenerateFormService, "_getKeyTypesJSONArray", false, true,
			false, false,
			HashMapBuilder.put(
				entitlement.getEntitlementId(), 5
			).build(),
			"DXP", licenseKeyTypeEntitlements, Collections.emptyList());

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject jsonObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals("production", jsonObject.getString("key"));

		JSONArray subscriptionsJSONArray = jsonObject.getJSONArray(
			"subscriptions");

		JSONObject subscriptionJSONObject =
			subscriptionsJSONArray.getJSONObject(0);

		Assertions.assertEquals(
			0, subscriptionJSONObject.getInt("availableCount"));
		Assertions.assertEquals(5, subscriptionJSONObject.getInt("totalCount"));
	}

	@Test
	public void testGetKeyTypesOffersComplimentaryWhenTheProjectHasNone() {
		JSONArray jsonArray = _getComplimentaryKeyTypesJSONArray(true, false);

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject subscriptionJSONObject = jsonArray.getJSONObject(
			0
		).getJSONArray(
			"subscriptions"
		).getJSONObject(
			0
		);

		Assertions.assertEquals(
			1, subscriptionJSONObject.getInt("availableCount"));
		Assertions.assertEquals(1, subscriptionJSONObject.getInt("totalCount"));
	}

	@Test
	public void testGetKeyTypesSkipsComplimentaryWhenNotAllowed() {
		JSONArray jsonArray = _getComplimentaryKeyTypesJSONArray(false, false);

		Assertions.assertEquals(0, jsonArray.length());
	}

	@Test
	public void testGetKeyTypesSpendsComplimentaryWhileTheProjectHasOne() {
		JSONArray jsonArray = _getComplimentaryKeyTypesJSONArray(true, true);

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject jsonObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals("complimentary", jsonObject.getString("key"));

		JSONObject subscriptionJSONObject = jsonObject.getJSONArray(
			"subscriptions"
		).getJSONObject(
			0
		);

		Assertions.assertEquals(
			0, subscriptionJSONObject.getInt("availableCount"));
		Assertions.assertEquals(1, subscriptionJSONObject.getInt("totalCount"));
	}

	@Test
	public void testGetLicensedVersionsKeepsVersionsWithLicenseEntries() {
		LicenseEntryService licenseEntryService = Mockito.mock(
			LicenseEntryService.class);

		Mockito.when(
			licenseEntryService.getLicenseEntriesByNameVersion(
				Mockito.anyString(), Mockito.anyString())
		).thenReturn(
			Collections.emptyList()
		);

		Mockito.when(
			licenseEntryService.getLicenseEntriesByNameVersion(
				"Search%", "2026.Q1")
		).thenReturn(
			Collections.singletonList(
				new LicenseEntry(
					"search", "Search Production", "production", "2026.Q1",
					"2026.Q1"))
		);

		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			new LicenseKeyGenerateFormService();

		ReflectionTestUtils.setField(
			licenseKeyGenerateFormService, "_licenseEntryService",
			licenseEntryService);

		List<ProductVersion> productVersions = Arrays.asList(
			_toProductVersion("2026.Q1", "DXP 2026.Q1"),
			_toProductVersion("7.4", "DXP 7.4"));

		JSONArray jsonArray = ReflectionTestUtils.invokeMethod(
			licenseKeyGenerateFormService, "_getLicensedVersionsJSONArray",
			"Search", productVersions);

		Assertions.assertEquals(
			Collections.singletonList("DXP 2026.Q1"), jsonArray.toList());

		jsonArray = ReflectionTestUtils.invokeMethod(
			licenseKeyGenerateFormService, "_getLicensedVersionsJSONArray",
			"Workspace", productVersions);

		Assertions.assertTrue(jsonArray.isEmpty());
	}

	@Test
	public void testGetSummaryCarriesOnlyWhatTheListReads() throws Exception {
		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			Mockito.spy(new LicenseKeyGenerateFormService());

		Project project = Mockito.mock(Project.class);

		Mockito.doReturn(
			_toGenerateFormJSONObject(
				_toProductJSONObject(
					"PRDCT-CLOUD-NATIVE",
					_toKeyTypeJSONObject(
						"production", 3, "2026-12-31T00:00:00Z",
						"2026-01-01T00:00:00Z")),
				_toProductJSONObject(
					"PRDCT-DXP",
					_toKeyTypeJSONObject("production", 0, null, null)))
		).when(
			licenseKeyGenerateFormService
		).getGenerateForm(
			false, project, null
		);

		JSONObject jsonObject = licenseKeyGenerateFormService.getSummary(
			false, project);

		Assertions.assertTrue(jsonObject.getBoolean("generatable"));

		JSONArray jsonArray = jsonObject.getJSONArray("cloudNativeKeyTypes");

		Assertions.assertEquals(1, jsonArray.length());
		Assertions.assertEquals(
			"production",
			jsonArray.getJSONObject(
				0
			).getString(
				"key"
			));

		Assertions.assertFalse(jsonObject.has("products"));
		Assertions.assertFalse(jsonObject.has("bundleProducts"));
	}

	@Test
	public void testGetTotalCountRoundsDown() {
		Assertions.assertEquals(
			3,
			LicenseKeyGenerateFormService.getTotalCount(_toEntitlement(3.7)));
	}

	@Test
	public void testGetTotalCountWithoutMaxQuantity() {
		Assertions.assertEquals(
			0,
			LicenseKeyGenerateFormService.getTotalCount(_toEntitlement(null)));
	}

	@Test
	public void testIsAllowComplimentary() throws Exception {
		AccountService accountService = Mockito.mock(AccountService.class);

		Account allowedAccount = new Account();

		allowedAccount.setCustomFields(
			() -> new CustomField[] {
				_toCustomField("allowComplimentary", true)
			});

		Mockito.when(
			accountService.getAccount(1L)
		).thenReturn(
			allowedAccount
		);

		Mockito.when(
			accountService.getAccount(2L)
		).thenReturn(
			new Account()
		);

		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			new LicenseKeyGenerateFormService();

		ReflectionTestUtils.setField(
			licenseKeyGenerateFormService, "_accountService", accountService);

		Assertions.assertTrue(
			licenseKeyGenerateFormService.isAllowComplimentary(1L));
		Assertions.assertFalse(
			licenseKeyGenerateFormService.isAllowComplimentary(2L));
	}

	@Test
	public void testIsGeneratableWithAnAvailableSubscription() {
		Assertions.assertTrue(
			_isGeneratable(
				_toProductJSONObject(
					"PRDCT-DXP",
					_toKeyTypeJSONObject("production", 0, null, null),
					_toKeyTypeJSONObject("developer", 2, null, null))));
	}

	@Test
	public void testIsGeneratableWithEverySubscriptionSpent() {
		Assertions.assertFalse(
			_isGeneratable(
				_toProductJSONObject(
					"PRDCT-DXP",
					_toKeyTypeJSONObject("production", 0, null, null))));
	}

	@Test
	public void testIsGeneratableWithoutProducts() {
		Assertions.assertFalse(_isGeneratable());
	}

	@Test
	public void testToCloudNativeDeveloperVersionsKeepsTheCurrentYearAnd74() {
		JSONArray jsonArray = ReflectionTestUtils.invokeMethod(
			new LicenseKeyGenerateFormService(),
			"_toCloudNativeDeveloperVersionsJSONArray",
			Arrays.asList(
				_toProductVersion("2026.Q2", "DXP 2026.Q2"),
				_toProductVersion("2026.Q1", "DXP 2026.Q1"),
				_toProductVersion("2025.Q4", "DXP 2025.Q4"),
				_toProductVersion("7.4", "DXP 7.4"),
				_toProductVersion("7.3", "DXP 7.3")),
			Year.of(2026));

		Assertions.assertEquals(
			Arrays.asList("DXP 2026.Q2", "DXP 2026.Q1", "DXP 7.4"),
			jsonArray.toList());
	}

	@Test
	public void testToComparableVersionWithBlankProductVersion() {
		Assertions.assertEquals(
			"", LicenseKeyGenerateFormService.toComparableVersion(null));
		Assertions.assertEquals(
			"", LicenseKeyGenerateFormService.toComparableVersion(""));
	}

	@Test
	public void testToComparableVersionWithLongTermSupport() {
		Assertions.assertEquals(
			"2026.Q1",
			LicenseKeyGenerateFormService.toComparableVersion(
				"DXP 2026.Q1 LTS"));
	}

	@Test
	public void testToComparableVersionWithProductFamily() {
		Assertions.assertEquals(
			"7.4",
			LicenseKeyGenerateFormService.toComparableVersion("DXP 7.4"));
	}

	@Test
	public void testToComparableVersionWithoutFamily() {
		Assertions.assertEquals(
			"7.4", LicenseKeyGenerateFormService.toComparableVersion("7.4"));
	}

	@Test
	public void testToComparableVersionWithoutNumber() {
		Assertions.assertEquals(
			"DXP Latest",
			LicenseKeyGenerateFormService.toComparableVersion("DXP Latest"));
	}

	private JSONArray _getComplimentaryKeyTypesJSONArray(
		boolean allowComplimentary, boolean hasComplimentaryActivationKey) {

		LicenseKeyTypeService licenseKeyTypeService = Mockito.mock(
			LicenseKeyTypeService.class);

		Mockito.when(
			licenseKeyTypeService.getLicenseKeyTypes()
		).thenReturn(
			Collections.singletonList(LicenseKeyType.COMPLIMENTARY)
		);

		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			new LicenseKeyGenerateFormService();

		ReflectionTestUtils.setField(
			licenseKeyGenerateFormService, "_licenseKeyTypeService",
			licenseKeyTypeService);

		return ReflectionTestUtils.invokeMethod(
			licenseKeyGenerateFormService, "_getKeyTypesJSONArray", false,
			allowComplimentary, hasComplimentaryActivationKey, false,
			Collections.emptyMap(), "DXP",
			HashMapBuilder.<String, Map<String, Entitlement>>put(
				"DXP",
				(Map<String, Entitlement>)HashMapBuilder.put(
					"complimentary", _toEntitlement(1.0)
				).build()
			).build(),
			Collections.emptyList());
	}

	private List<Object> _getEntitledProducts(
		List<Entitlement> entitlements,
		LicenseKeyGenerateFormService licenseKeyGenerateFormService) {

		Map<Long, Object> resolvedProducts = ReflectionTestUtils.invokeMethod(
			licenseKeyGenerateFormService, "_getResolvedProducts",
			entitlements);

		return ReflectionTestUtils.invokeMethod(
			licenseKeyGenerateFormService, "_getEntitledProducts", entitlements,
			resolvedProducts);
	}

	private boolean _isGeneratable(JSONObject... productJSONObjects) {
		Boolean generatable = ReflectionTestUtils.invokeMethod(
			new LicenseKeyGenerateFormService(), "_isGeneratable",
			_toGenerateFormJSONObject(productJSONObjects));

		return Boolean.TRUE.equals(generatable);
	}

	private CustomField _toCustomField(String name, Object data) {
		CustomField customField = new CustomField();

		customField.setName(() -> name);

		CustomValue customValue = new CustomValue();

		customValue.setData(() -> data);

		customField.setCustomValue(() -> customValue);

		return customField;
	}

	private Entitlement _toEntitlement(Double maxQuantity) {
		JSONObject jsonObject = new JSONObject(
		).put(
			"id", 1L
		);

		if (maxQuantity != null) {
			jsonObject.put("maxQuantity", maxQuantity);
		}

		return new Entitlement(jsonObject);
	}

	private JSONObject _toGenerateFormJSONObject(
		JSONObject... productJSONObjects) {

		JSONArray productsJSONArray = new JSONArray();

		for (JSONObject productJSONObject : productJSONObjects) {
			productsJSONArray.put(productJSONObject);
		}

		return new JSONObject(
		).put(
			"products", productsJSONArray
		);
	}

	private JSONObject _toKeyTypeJSONObject(
		String key, int availableCount, String endDate, String startDate) {

		return new JSONObject(
		).put(
			"key", key
		).put(
			"subscriptions",
			new JSONArray(
			).put(
				new JSONObject(
				).put(
					"availableCount", availableCount
				).put(
					"endDate", endDate
				).put(
					"startDate", startDate
				)
			)
		);
	}

	private Entitlement _toLicenseGenerationEntitlement(
		long entitlementId, boolean generatesActivationKey,
		String licenseKeyFamily, String licenseKeyType,
		String skuExternalReferenceCode) {

		return new Entitlement(
			new JSONObject(
			).put(
				"entitlementDefinitionToEntitlement",
				new JSONObject(
				).put(
					"generatesActivationKey", generatesActivationKey
				).put(
					"id", entitlementId
				).put(
					"licenseKeyFamily", licenseKeyFamily
				).put(
					"licenseKeyType", licenseKeyType
				).put(
					"name",
					LicenseKeyGenerationConstants.
						ENTITLEMENT_DEFINITION_NAME_LICENSE_GENERATION
				).put(
					"skuExternalReferenceCode", skuExternalReferenceCode
				)
			).put(
				"id", entitlementId
			));
	}

	private LicenseKeyGenerateFormService _toLicenseKeyGenerateFormService(
			String productExternalReferenceCode, Map<String, Sku> skus)
		throws Exception {

		CommerceProductService commerceProductService = Mockito.mock(
			CommerceProductService.class);
		CommerceSkuService commerceSkuService = Mockito.mock(
			CommerceSkuService.class);

		Product product = new Product();

		product.setExternalReferenceCode(productExternalReferenceCode);
		product.setProductId(1L);

		Mockito.when(
			commerceProductService.fetchProduct(1L)
		).thenReturn(
			product
		);

		for (Map.Entry<String, Sku> entry : skus.entrySet()) {
			Mockito.when(
				commerceSkuService.fetchSku(entry.getKey())
			).thenReturn(
				entry.getValue()
			);
		}

		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			new LicenseKeyGenerateFormService();

		ReflectionTestUtils.setField(
			licenseKeyGenerateFormService, "_commerceProductService",
			commerceProductService);
		ReflectionTestUtils.setField(
			licenseKeyGenerateFormService, "_commerceSkuService",
			commerceSkuService);

		return licenseKeyGenerateFormService;
	}

	private JSONObject _toProductJSONObject(
		String externalReferenceCode, JSONObject... keyTypeJSONObjects) {

		JSONArray keyTypesJSONArray = new JSONArray();

		for (JSONObject keyTypeJSONObject : keyTypeJSONObjects) {
			keyTypesJSONArray.put(keyTypeJSONObject);
		}

		return new JSONObject(
		).put(
			"externalReferenceCode", externalReferenceCode
		).put(
			"keyTypes", keyTypesJSONArray
		);
	}

	private ProductVersion _toProductVersion(
		String productGroupVersion, String version) {

		return new ProductVersion(
			new JSONObject(
			).put(
				"id", 1L
			).put(
				"productGroupVersion", productGroupVersion
			).put(
				"productVersion", version
			));
	}

	private Sku _toSku(Long productId, String skuOptionKey) {
		Sku sku = new Sku();

		sku.setProductId(productId);

		if (skuOptionKey != null) {
			SkuOption skuOption = new SkuOption();

			skuOption.setKey(skuOptionKey);
			skuOption.setValue("developer");

			sku.setSkuOptions(new SkuOption[] {skuOption});
		}

		return sku;
	}

}