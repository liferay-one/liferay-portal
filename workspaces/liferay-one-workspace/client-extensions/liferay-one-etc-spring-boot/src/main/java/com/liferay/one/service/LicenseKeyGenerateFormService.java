/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.license.LicenseEntry;
import com.liferay.one.license.LicenseEntryService;
import com.liferay.one.license.LicenseKeyType;
import com.liferay.one.license.LicenseKeyTypeService;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.ProductVersion;
import com.liferay.one.model.Project;
import com.liferay.one.util.AccountUtil;
import com.liferay.one.util.CommerceProductUtil;
import com.liferay.one.util.CommerceSkuUtil;
import com.liferay.one.util.comparator.VersionComparator;
import com.liferay.petra.string.CharPool;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;
import java.time.Year;
import java.time.ZoneOffset;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Pedro Oliveira
 */
@Component
public class LicenseKeyGenerateFormService {

	public static String getLicenseKeyFamily(Entitlement entitlement) {
		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if (entitlementDefinition == null) {
			return StringPool.BLANK;
		}

		return entitlementDefinition.getLicenseKeyFamily();
	}

	public static String getLicenseKeyType(Entitlement entitlement) {
		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if (entitlementDefinition == null) {
			return StringPool.BLANK;
		}

		return entitlementDefinition.getLicenseKeyType();
	}

	public static int getTotalCount(Entitlement entitlement) {
		Double maxQuantity = entitlement.getMaxQuantity();

		if (maxQuantity == null) {
			return 0;
		}

		return maxQuantity.intValue();
	}

	public static String toComparableVersion(String productVersion) {
		if (Validator.isNull(productVersion)) {
			return StringPool.BLANK;
		}

		for (String part : productVersion.split(StringPool.SPACE)) {
			if (part.isEmpty()) {
				continue;
			}

			char c = part.charAt(0);

			if ((c >= CharPool.NUMBER_0) && (c <= CharPool.NUMBER_9)) {
				return part;
			}
		}

		return productVersion;
	}

	public LicenseEntry fetchLicenseEntry(
		String keyTypeKey, String licenseKeyFamily, String version) {

		if (Validator.isNull(keyTypeKey)) {
			return null;
		}

		LicenseKeyType licenseKeyType = LicenseKeyType.fetchLicenseKeyType(
			toLicenseEntryKeyType(keyTypeKey));

		for (LicenseEntry licenseEntry :
				_getLicenseEntries(licenseKeyFamily, version)) {

			if (licenseKeyType == null) {
				if (Objects.equals(keyTypeKey, licenseEntry.getName())) {
					return licenseEntry;
				}
			}
			else if (licenseKeyType.matches(licenseEntry)) {
				return licenseEntry;
			}
		}

		return null;
	}

	public Product fetchProduct(Entitlement entitlement) throws Exception {
		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if (entitlementDefinition == null) {
			return null;
		}

		String skuExternalReferenceCode =
			entitlementDefinition.getSkuExternalReferenceCode();

		return _fetchProduct(
			entitlement, _commerceSkuService.fetchSku(skuExternalReferenceCode),
			skuExternalReferenceCode);
	}

	public JSONObject getGenerateForm(
			boolean admin, Project project,
			String renewedActivationKeyExternalReferenceCode)
		throws Exception {

		String projectExternalReferenceCode =
			project.getExternalReferenceCode();

		List<Entitlement> entitlements =
			_entitlementService.getActiveEntitlements(
				projectExternalReferenceCode);

		Map<Long, ResolvedProduct> resolvedProducts = _getResolvedProducts(
			entitlements);

		List<EntitledProduct> entitledProducts = _getEntitledProducts(
			_getDisasterRecoveryExternalReferenceCodes(entitlements),
			entitlements, resolvedProducts);

		Map<String, Map<String, Entitlement>> licenseKeyTypeEntitlements =
			_getLicenseKeyTypeEntitlements(entitlements, resolvedProducts);

		Map<Long, Integer> licenseKeyCounts =
			_licenseKeyService.getActiveLicenseKeyCounts(
				_getRenewedActivationKeyIds(
					renewedActivationKeyExternalReferenceCode),
				projectExternalReferenceCode);

		List<ProductVersion> productVersions = _getProductVersions();

		boolean allowComplimentary = isAllowComplimentary(
			project.getAccountId());

		boolean hasComplimentaryActivationKey = false;

		if (allowComplimentary) {
			int complimentaryActivationKeysCount =
				_activationKeyService.getActivationKeysCount(
					true, projectExternalReferenceCode,
					LicenseKeyGenerationConstants.KEY_TYPE_COMPLIMENTARY);

			if (complimentaryActivationKeysCount > 0) {
				hasComplimentaryActivationKey = true;
			}
		}

		JSONArray bundleProductsJSONArray = new JSONArray();
		JSONArray cloudNativeDeveloperVersionsJSONArray =
			_toCloudNativeDeveloperVersionsJSONArray(
				productVersions, Year.now(ZoneOffset.UTC));
		JSONArray productsJSONArray = new JSONArray();
		JSONArray developerVersionsJSONArray = _toDeveloperVersionsJSONArray(
			productVersions);
		JSONArray versionsJSONArray = _toVersionsJSONArray(productVersions);

		for (EntitledProduct entitledProduct : entitledProducts) {
			JSONArray licensedVersionsJSONArray = _getLicensedVersionsJSONArray(
				entitledProduct.getLicenseKeyFamily(), productVersions);

			boolean hasLicenseEntries = !licensedVersionsJSONArray.isEmpty();

			JSONArray keyTypesJSONArray = _getKeyTypesJSONArray(
				admin, allowComplimentary, hasComplimentaryActivationKey,
				hasLicenseEntries, licenseKeyCounts,
				entitledProduct.getLicenseKeyFamily(),
				licenseKeyTypeEntitlements, productVersions);

			if (entitledProduct.isGeneratesActivationKey()) {
				bundleProductsJSONArray.put(
					_toBundleProductJSONObject(
						entitledProduct,
						(keyTypesJSONArray.length() > 0) || !hasLicenseEntries,
						licenseKeyCounts, licensedVersionsJSONArray));
			}

			if (keyTypesJSONArray.length() == 0) {
				continue;
			}

			JSONArray productDeveloperVersionsJSONArray =
				developerVersionsJSONArray;

			if (Objects.equals(
					LicenseKeyGenerationConstants.
						PRODUCT_EXTERNAL_REFERENCE_CODE_CLOUD_NATIVE,
					entitledProduct.getExternalReferenceCode())) {

				productDeveloperVersionsJSONArray =
					cloudNativeDeveloperVersionsJSONArray;
			}

			productsJSONArray.put(
				new JSONObject(
				).put(
					"developerVersions", productDeveloperVersionsJSONArray
				).put(
					"entitlementId",
					entitledProduct.getEntitlement(
					).getEntitlementId()
				).put(
					"externalReferenceCode",
					entitledProduct.getExternalReferenceCode()
				).put(
					"keyTypes", keyTypesJSONArray
				).put(
					"label", entitledProduct.getLicenseKeyFamily()
				).put(
					"name", entitledProduct.getName()
				).put(
					"versions", versionsJSONArray
				));
		}

		return new JSONObject(
		).put(
			"bundleProducts", bundleProductsJSONArray
		).put(
			"products", productsJSONArray
		);
	}

	/**
	 * Returns only what the activation key list reads off the generate form:
	 * whether anything is left to generate, and the Cloud Native subscription
	 * dates each environment row is stamped with. The list has no use for the
	 * products, bundle products, versions and license entry types the form
	 * also carries.
	 */
	public JSONObject getSummary(boolean admin, Project project)
		throws Exception {

		JSONObject generateFormJSONObject = getGenerateForm(
			admin, project, null);

		return new JSONObject(
		).put(
			"cloudNativeKeyTypes",
			_getCloudNativeKeyTypesJSONArray(generateFormJSONObject)
		).put(
			"generatable", _isGeneratable(generateFormJSONObject)
		);
	}

	public boolean grantsLicense(Entitlement entitlement) {
		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if (entitlementDefinition == null) {
			return false;
		}

		return Objects.equals(
			LicenseKeyGenerationConstants.
				ENTITLEMENT_DEFINITION_NAME_LICENSE_GENERATION,
			entitlementDefinition.getName());
	}

	public boolean isAllowComplimentary(long accountId) throws Exception {
		return AccountUtil.getCustomFieldBoolean(
			_accountService.getAccount(accountId), "allowComplimentary", false);
	}

	public boolean isLicensedForVersion(String licenseKeyFamily, String version)
		throws Exception {

		JSONArray licensedVersionsJSONArray = _getLicensedVersionsJSONArray(
			licenseKeyFamily, _getProductVersions());

		if (licensedVersionsJSONArray.isEmpty()) {
			return true;
		}

		List<Object> licensedVersions = licensedVersionsJSONArray.toList();

		return licensedVersions.contains(version);
	}

	public String toLicenseEntryKeyType(String keyTypeKey) {
		if (Objects.equals(
				LicenseKeyGenerationConstants.KEY_TYPE_COMPLIMENTARY,
				keyTypeKey)) {

			return LicenseKeyGenerationConstants.KEY_TYPE_PRODUCTION;
		}

		return keyTypeKey;
	}

	private LicenseEntry _fetchLicenseEntry(
		String licenseKeyFamily, LicenseKeyType licenseKeyType,
		List<ProductVersion> productVersions) {

		licenseKeyType = LicenseKeyType.fetchLicenseKeyType(
			toLicenseEntryKeyType(licenseKeyType.getKey()));

		if (licenseKeyType == null) {
			return null;
		}

		for (ProductVersion productVersion : productVersions) {
			for (LicenseEntry licenseEntry :
					_getLicenseEntries(
						licenseKeyFamily, productVersion.getVersion())) {

				if (licenseKeyType.matches(licenseEntry)) {
					return licenseEntry;
				}
			}
		}

		return null;
	}

	private Product _fetchProduct(
			Entitlement entitlement, Sku sku, String skuExternalReferenceCode)
		throws Exception {

		Long productId = (sku == null) ? null : sku.getProductId();

		if (productId == null) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Unable to find a SKU with external reference code ",
						skuExternalReferenceCode, " for entitlement ",
						entitlement.getEntitlementId()));
			}

			return null;
		}

		return _commerceProductService.fetchProduct(productId);
	}

	private boolean _generatesActivationKey(
		Entitlement entitlement, ResolvedProduct resolvedProduct) {

		if (CommerceSkuUtil.hasLicenseUsageTypeOption(
				resolvedProduct._getSku())) {

			return true;
		}

		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if (entitlementDefinition == null) {
			return false;
		}

		return entitlementDefinition.isGeneratesActivationKey();
	}

	private JSONArray _getCloudNativeKeyTypesJSONArray(
		JSONObject generateFormJSONObject) {

		JSONArray jsonArray = new JSONArray();

		JSONArray productsJSONArray = generateFormJSONObject.getJSONArray(
			"products");

		for (int i = 0; i < productsJSONArray.length(); i++) {
			JSONObject productJSONObject = productsJSONArray.getJSONObject(i);

			if (!Objects.equals(
					LicenseKeyGenerationConstants.
						PRODUCT_EXTERNAL_REFERENCE_CODE_CLOUD_NATIVE,
					productJSONObject.optString("externalReferenceCode"))) {

				continue;
			}

			JSONArray keyTypesJSONArray = productJSONObject.getJSONArray(
				"keyTypes");

			for (int j = 0; j < keyTypesJSONArray.length(); j++) {
				JSONObject keyTypeJSONObject = keyTypesJSONArray.getJSONObject(
					j);

				JSONArray subscriptionsJSONArray =
					keyTypeJSONObject.getJSONArray("subscriptions");

				if (subscriptionsJSONArray.length() == 0) {
					continue;
				}

				JSONObject subscriptionJSONObject =
					subscriptionsJSONArray.getJSONObject(0);

				jsonArray.put(
					new JSONObject(
					).put(
						"endDate", subscriptionJSONObject.opt("endDate")
					).put(
						"key", keyTypeJSONObject.optString("key")
					).put(
						"startDate", subscriptionJSONObject.opt("startDate")
					));
			}
		}

		return jsonArray;
	}

	private Set<String> _getDisasterRecoveryExternalReferenceCodes(
			List<Entitlement> entitlements)
		throws Exception {

		Set<String> externalReferenceCodes = new HashSet<>();

		for (Entitlement entitlement : entitlements) {
			EntitlementDefinition entitlementDefinition =
				entitlement.getEntitlementDefinition();

			if ((entitlementDefinition == null) ||
				!Objects.equals(
					EntitlementConstants.NAME_DISASTER_RECOVERY,
					entitlement.getName())) {

				continue;
			}

			String skuExternalReferenceCode =
				entitlementDefinition.getSkuExternalReferenceCode();

			Product product = _fetchProduct(
				entitlement,
				_commerceSkuService.fetchSku(skuExternalReferenceCode),
				skuExternalReferenceCode);

			if (product != null) {
				externalReferenceCodes.add(product.getExternalReferenceCode());
			}
		}

		return externalReferenceCodes;
	}

	private List<EntitledProduct> _getEntitledProducts(
		Set<String> disasterRecoveryExternalReferenceCodes,
		List<Entitlement> entitlements,
		Map<Long, ResolvedProduct> resolvedProducts) {

		List<EntitledProduct> entitledProducts = new ArrayList<>();

		Set<String> externalReferenceCodes = new LinkedHashSet<>();
		Set<String> generatesActivationKeyExternalReferenceCodes =
			_getGeneratesActivationKeyExternalReferenceCodes(
				entitlements, resolvedProducts);

		for (Entitlement entitlement : _orderByLicenseKeyType(entitlements)) {
			ResolvedProduct resolvedProduct = resolvedProducts.get(
				entitlement.getEntitlementId());

			if (resolvedProduct == null) {
				continue;
			}

			Product product = resolvedProduct._getProduct();

			String externalReferenceCode = product.getExternalReferenceCode();

			if (!externalReferenceCodes.add(externalReferenceCode)) {
				continue;
			}

			entitledProducts.add(
				new EntitledProduct(
					disasterRecoveryExternalReferenceCodes.contains(
						externalReferenceCode),
					entitlement, externalReferenceCode,
					generatesActivationKeyExternalReferenceCodes.contains(
						externalReferenceCode),
					getLicenseKeyFamily(entitlement),
					CommerceProductUtil.getName(product)));
		}

		return entitledProducts;
	}

	private Set<String> _getGeneratesActivationKeyExternalReferenceCodes(
		List<Entitlement> entitlements,
		Map<Long, ResolvedProduct> resolvedProducts) {

		Set<String> externalReferenceCodes = new HashSet<>();

		for (Entitlement entitlement : entitlements) {
			ResolvedProduct resolvedProduct = resolvedProducts.get(
				entitlement.getEntitlementId());

			if ((resolvedProduct == null) ||
				!_generatesActivationKey(entitlement, resolvedProduct)) {

				continue;
			}

			Product product = resolvedProduct._getProduct();

			externalReferenceCodes.add(product.getExternalReferenceCode());
		}

		return externalReferenceCodes;
	}

	private JSONArray _getKeyTypesJSONArray(
		boolean admin, boolean allowComplimentary,
		boolean hasComplimentaryActivationKey, boolean hasLicenseEntries,
		Map<Long, Integer> licenseKeyCounts, String licenseKeyFamily,
		Map<String, Map<String, Entitlement>> licenseKeyTypeEntitlements,
		List<ProductVersion> productVersions) {

		JSONArray jsonArray = new JSONArray();

		Map<String, Entitlement> entitlements = licenseKeyTypeEntitlements.get(
			licenseKeyFamily);

		if (entitlements == null) {
			return jsonArray;
		}

		for (LicenseKeyType licenseKeyType :
				_licenseKeyTypeService.getLicenseKeyTypes()) {

			if (!admin && _licenseKeyTypeService.isAdminType(licenseKeyType)) {
				continue;
			}

			boolean complimentary = false;

			if (licenseKeyType == LicenseKeyType.COMPLIMENTARY) {
				complimentary = true;
			}

			if (complimentary && !allowComplimentary) {
				continue;
			}

			Entitlement entitlement = entitlements.get(licenseKeyType.getKey());

			if (entitlement == null) {
				continue;
			}

			LicenseEntry licenseEntry = _fetchLicenseEntry(
				licenseKeyFamily, licenseKeyType, productVersions);

			if ((licenseEntry == null) && hasLicenseEntries &&
				licenseKeyType.isLicenseEntryBacked()) {

				continue;
			}

			JSONArray subscriptionsJSONArray = _getSubscriptionsJSONArray(
				entitlement, licenseKeyCounts,
				complimentary && hasComplimentaryActivationKey);

			jsonArray.put(
				new JSONObject(
				).put(
					"entitlementId", entitlement.getEntitlementId()
				).put(
					"key", licenseKeyType.getKey()
				).put(
					"licenseEntryType",
					(licenseEntry == null) ? StringPool.BLANK :
						licenseEntry.getType()
				).put(
					"productKey",
					(licenseEntry == null) ? StringPool.BLANK :
						licenseEntry.getProductKey()
				).put(
					"subscriptions", subscriptionsJSONArray
				));
		}

		return jsonArray;
	}

	private List<LicenseEntry> _getLicenseEntries(
		String licenseKeyFamily, String version) {

		if (Validator.isNull(licenseKeyFamily)) {
			return new ArrayList<>();
		}

		List<LicenseEntry> licenseEntries = new ArrayList<>();

		for (LicenseEntry licenseEntry :
				_licenseEntryService.getLicenseEntriesByNameVersion(
					licenseKeyFamily + "%", toComparableVersion(version))) {

			if (LicenseKeyType.fetchLicenseKeyType(licenseEntry) == null) {
				continue;
			}

			licenseEntries.add(licenseEntry);
		}

		return licenseEntries;
	}

	private Map<String, Map<String, Entitlement>>
		_getLicenseKeyTypeEntitlements(
			List<Entitlement> entitlements,
			Map<Long, ResolvedProduct> resolvedProducts) {

		Map<String, Map<String, Entitlement>> licenseKeyTypeEntitlements =
			new HashMap<>();

		for (Entitlement entitlement : entitlements) {
			ResolvedProduct resolvedProduct = resolvedProducts.get(
				entitlement.getEntitlementId());

			if (resolvedProduct == null) {
				continue;
			}

			String licenseKeyType = getLicenseKeyType(entitlement);

			if (Validator.isNull(licenseKeyType)) {
				continue;
			}

			String licenseKeyFamily = getLicenseKeyFamily(entitlement);

			if (Validator.isNull(licenseKeyFamily)) {
				continue;
			}

			Map<String, Entitlement> entitlementsMap =
				licenseKeyTypeEntitlements.computeIfAbsent(
					licenseKeyFamily, key -> new HashMap<>());

			entitlementsMap.putIfAbsent(licenseKeyType, entitlement);
		}

		return licenseKeyTypeEntitlements;
	}

	private JSONArray _getLicensedVersionsJSONArray(
		String licenseKeyFamily, List<ProductVersion> productVersions) {

		JSONArray jsonArray = new JSONArray();

		for (ProductVersion productVersion : productVersions) {
			List<LicenseEntry> licenseEntries = _getLicenseEntries(
				licenseKeyFamily, productVersion.getVersion());

			if (!licenseEntries.isEmpty()) {
				jsonArray.put(productVersion.getVersion());
			}
		}

		return jsonArray;
	}

	private List<ProductVersion> _getProductVersions() throws Exception {
		return _productVersionService.getProductVersions(
			LicenseKeyGenerationConstants.PRODUCT_GROUP_DXP, true);
	}

	private List<Long> _getRenewedActivationKeyIds(
			String renewedActivationKeyExternalReferenceCode)
		throws Exception {

		if (Validator.isNull(renewedActivationKeyExternalReferenceCode)) {
			return Collections.emptyList();
		}

		ActivationKey activationKey = _activationKeyService.fetchActivationKey(
			renewedActivationKeyExternalReferenceCode);

		if (activationKey == null) {
			return Collections.emptyList();
		}

		return Collections.singletonList(activationKey.getActivationKeyId());
	}

	private Map<Long, ResolvedProduct> _getResolvedProducts(
			List<Entitlement> entitlements)
		throws Exception {

		Map<Long, ResolvedProduct> resolvedProducts = new HashMap<>();
		Map<String, ResolvedProduct> skuResolvedProducts = new HashMap<>();
		Set<String> skuExternalReferenceCodes = new HashSet<>();

		for (Entitlement entitlement : entitlements) {
			if (!grantsLicense(entitlement)) {
				continue;
			}

			EntitlementDefinition entitlementDefinition =
				entitlement.getEntitlementDefinition();

			String skuExternalReferenceCode =
				entitlementDefinition.getSkuExternalReferenceCode();

			ResolvedProduct resolvedProduct = null;

			if (skuExternalReferenceCodes.add(skuExternalReferenceCode)) {
				Sku sku = _commerceSkuService.fetchSku(
					skuExternalReferenceCode);

				Product product = _fetchProduct(
					entitlement, sku, skuExternalReferenceCode);

				if (product != null) {
					resolvedProduct = new ResolvedProduct(product, sku);

					skuResolvedProducts.put(
						skuExternalReferenceCode, resolvedProduct);
				}
			}
			else {
				resolvedProduct = skuResolvedProducts.get(
					skuExternalReferenceCode);
			}

			if (resolvedProduct != null) {
				resolvedProducts.put(
					entitlement.getEntitlementId(), resolvedProduct);
			}
		}

		return resolvedProducts;
	}

	private JSONArray _getSubscriptionsJSONArray(
		Entitlement entitlement, Map<Long, Integer> licenseKeyCounts,
		boolean spent) {

		JSONArray jsonArray = new JSONArray();

		int totalCount = getTotalCount(entitlement);

		int usedCount = licenseKeyCounts.getOrDefault(
			entitlement.getEntitlementId(), 0);

		int availableCount = spent ? 0 : Math.max(0, totalCount - usedCount);

		jsonArray.put(
			new JSONObject(
			).put(
				"availableCount", availableCount
			).put(
				"endDate", _toISO8601(entitlement.getEndDateInstant())
			).put(
				"entitlementId", entitlement.getEntitlementId()
			).put(
				"instanceSize", _INSTANCE_SIZE_DEFAULT
			).put(
				"startDate", _toISO8601(entitlement.getStartDateInstant())
			).put(
				"totalCount", totalCount
			));

		return jsonArray;
	}

	private boolean _isGeneratable(JSONObject generateFormJSONObject) {
		JSONArray productsJSONArray = generateFormJSONObject.getJSONArray(
			"products");

		for (int i = 0; i < productsJSONArray.length(); i++) {
			JSONObject productJSONObject = productsJSONArray.getJSONObject(i);

			JSONArray keyTypesJSONArray = productJSONObject.getJSONArray(
				"keyTypes");

			for (int j = 0; j < keyTypesJSONArray.length(); j++) {
				JSONObject keyTypeJSONObject = keyTypesJSONArray.getJSONObject(
					j);

				JSONArray subscriptionsJSONArray =
					keyTypeJSONObject.getJSONArray("subscriptions");

				for (int k = 0; k < subscriptionsJSONArray.length(); k++) {
					JSONObject subscriptionJSONObject =
						subscriptionsJSONArray.getJSONObject(k);

					if (subscriptionJSONObject.optInt("availableCount") > 0) {
						return true;
					}
				}
			}
		}

		return false;
	}

	private List<Entitlement> _orderByLicenseKeyType(
		List<Entitlement> entitlements) {

		List<Entitlement> orderedEntitlements = new ArrayList<>();

		for (Entitlement entitlement : entitlements) {
			if (Validator.isNull(getLicenseKeyType(entitlement))) {
				orderedEntitlements.add(entitlement);
			}
		}

		for (Entitlement entitlement : entitlements) {
			if (Validator.isNotNull(getLicenseKeyType(entitlement))) {
				orderedEntitlements.add(entitlement);
			}
		}

		return orderedEntitlements;
	}

	private JSONObject _toBundleProductJSONObject(
		EntitledProduct entitledProduct, boolean licensable,
		Map<Long, Integer> licenseKeyCounts,
		JSONArray licensedVersionsJSONArray) {

		Entitlement entitlement = entitledProduct.getEntitlement();

		int usedCount = licenseKeyCounts.getOrDefault(
			entitlement.getEntitlementId(), 0);

		return new JSONObject(
		).put(
			"availableCount",
			Math.max(0, getTotalCount(entitlement) - usedCount)
		).put(
			"disasterRecovery", entitledProduct.isDisasterRecovery()
		).put(
			"entitlementId", entitlement.getEntitlementId()
		).put(
			"externalReferenceCode", entitledProduct.getExternalReferenceCode()
		).put(
			"licensable", licensable
		).put(
			"licensedVersions", licensedVersionsJSONArray
		).put(
			"licenseKeyFamily", entitledProduct.getLicenseKeyFamily()
		).put(
			"name", entitledProduct.getName()
		);
	}

	private JSONArray _toCloudNativeDeveloperVersionsJSONArray(
		List<ProductVersion> productVersions, Year year) {

		JSONArray jsonArray = new JSONArray();

		String quarterlyPrefix = year.getValue() + ".Q";

		for (ProductVersion productVersion : productVersions) {
			String productGroupVersion =
				productVersion.getProductGroupVersion();

			if (Validator.isNull(productGroupVersion)) {
				continue;
			}

			if (productGroupVersion.startsWith(quarterlyPrefix) ||
				Objects.equals(
					productGroupVersion,
					LicenseKeyGenerationConstants.MINIMUM_DEVELOPER_VERSION)) {

				jsonArray.put(productVersion.getVersion());
			}
		}

		return jsonArray;
	}

	private JSONArray _toDeveloperVersionsJSONArray(
		List<ProductVersion> productVersions) {

		List<String> versions = new ArrayList<>();

		for (ProductVersion productVersion : productVersions) {
			versions.add(productVersion.getVersion());
		}

		List<String> latestVersions = new ArrayList<>(versions);

		latestVersions.sort(
			(version1, version2) -> _versionComparator.compare(
				toComparableVersion(version2), toComparableVersion(version1)));

		latestVersions = latestVersions.subList(
			0,
			Math.min(
				latestVersions.size(),
				LicenseKeyGenerationConstants.DEVELOPER_MAJOR_VERSION_COUNT));

		JSONArray jsonArray = new JSONArray();

		for (String version : versions) {
			if (latestVersions.contains(version) ||
				Objects.equals(
					toComparableVersion(version),
					LicenseKeyGenerationConstants.MINIMUM_DEVELOPER_VERSION)) {

				jsonArray.put(version);
			}
		}

		return jsonArray;
	}

	private String _toISO8601(Instant instant) {
		if (instant == null) {
			return null;
		}

		return instant.toString();
	}

	private JSONArray _toVersionsJSONArray(
		List<ProductVersion> productVersions) {

		JSONArray jsonArray = new JSONArray();

		for (ProductVersion productVersion : productVersions) {
			jsonArray.put(productVersion.getVersion());
		}

		return jsonArray;
	}

	private static final int _INSTANCE_SIZE_DEFAULT = 1;

	private static final Log _log = LogFactory.getLog(
		LicenseKeyGenerateFormService.class);

	@Autowired
	private AccountService _accountService;

	@Autowired
	private ActivationKeyService _activationKeyService;

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private CommerceSkuService _commerceSkuService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private LicenseEntryService _licenseEntryService;

	@Autowired
	private LicenseKeyService _licenseKeyService;

	@Autowired
	private LicenseKeyTypeService _licenseKeyTypeService;

	@Autowired
	private ProductVersionService _productVersionService;

	private final VersionComparator _versionComparator =
		new VersionComparator();

	private static class EntitledProduct {

		public EntitledProduct(
			boolean disasterRecovery, Entitlement entitlement,
			String externalReferenceCode, boolean generatesActivationKey,
			String licenseKeyFamily, String name) {

			_disasterRecovery = disasterRecovery;
			_entitlement = entitlement;
			_externalReferenceCode = externalReferenceCode;
			_generatesActivationKey = generatesActivationKey;
			_licenseKeyFamily = licenseKeyFamily;
			_name = name;
		}

		public Entitlement getEntitlement() {
			return _entitlement;
		}

		public String getExternalReferenceCode() {
			return _externalReferenceCode;
		}

		public String getLicenseKeyFamily() {
			return _licenseKeyFamily;
		}

		public String getName() {
			return _name;
		}

		public boolean isDisasterRecovery() {
			return _disasterRecovery;
		}

		public boolean isGeneratesActivationKey() {
			return _generatesActivationKey;
		}

		private final boolean _disasterRecovery;
		private final Entitlement _entitlement;
		private final String _externalReferenceCode;
		private final boolean _generatesActivationKey;
		private final String _licenseKeyFamily;
		private final String _name;

	}

	private static class ResolvedProduct {

		private ResolvedProduct(Product product, Sku sku) {
			_product = product;
			_sku = sku;
		}

		private Product _getProduct() {
			return _product;
		}

		private Sku _getSku() {
			return _sku;
		}

		private final Product _product;
		private final Sku _sku;

	}

}