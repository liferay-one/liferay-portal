/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.license.LicenseEntry;
import com.liferay.one.license.LicenseEntryService;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.ProductVersion;
import com.liferay.one.util.CommerceProductUtil;
import com.liferay.one.util.comparator.VersionComparator;
import com.liferay.petra.string.CharPool;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;

import java.util.ArrayList;
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
			char c = part.charAt(0);

			if ((c >= CharPool.NUMBER_0) && (c <= CharPool.NUMBER_9)) {
				return part;
			}
		}

		return productVersion;
	}

	public LicenseEntry fetchLicenseEntry(
		String keyTypeLabel, String licenseEntryFamily, String version) {

		String suffix = _getKeyTypeNameSuffix(keyTypeLabel);

		if (Validator.isNull(suffix)) {
			return null;
		}

		for (LicenseEntry licenseEntry :
				_getLicenseEntries(licenseEntryFamily, version)) {

			String name = licenseEntry.getName();

			if (name.endsWith(suffix)) {
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

		Long productId = _commerceSkuService.fetchProductId(
			skuExternalReferenceCode);

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

	public JSONObject getGenerateForm(String projectExternalReferenceCode)
		throws Exception {

		List<Entitlement> entitlements =
			_entitlementService.getActiveEntitlements(
				projectExternalReferenceCode);

		List<EntitledProduct> entitledProducts = _getEntitledProducts(
			entitlements);

		Map<Long, Integer> licenseKeyCounts =
			_licenseKeyService.getActiveLicenseKeyCounts(
				projectExternalReferenceCode);

		List<ProductVersion> productVersions = _getProductVersions();

		JSONArray bundleProductsJSONArray = new JSONArray();
		JSONArray productsJSONArray = new JSONArray();
		JSONArray developerVersionsJSONArray = _toDeveloperVersionsJSONArray(
			productVersions);
		JSONArray versionsJSONArray = _toVersionsJSONArray(productVersions);

		for (EntitledProduct entitledProduct : entitledProducts) {
			JSONArray keyTypesJSONArray = _getKeyTypesJSONArray(
				entitledProduct.getLicenseEntryFamily(), productVersions);

			if (entitledProduct.isGeneratesActivationKey()) {
				bundleProductsJSONArray.put(
					_toBundleProductJSONObject(
						entitledProduct, keyTypesJSONArray.length() > 0,
						licenseKeyCounts));
			}

			if ((keyTypesJSONArray.length() == 0) ||
				!_leadsActivationKey(entitledProduct)) {

				continue;
			}

			productsJSONArray.put(
				new JSONObject(
				).put(
					"developerVersions", developerVersionsJSONArray
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
					"name", entitledProduct.getName()
				).put(
					"subscriptions",
					_getSubscriptionsJSONArray(
						entitledProduct.getEntitlement(), licenseKeyCounts)
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

	public String getLicenseEntryFamily(Product product) throws Exception {
		Map<String, String> specificationValues =
			_commerceProductService.getSpecificationValues(
				product.getProductId());

		return specificationValues.get(
			ProductSpecificationConstants.KEY_LICENSE_ENTRY_FAMILY);
	}

	private boolean _generatesActivationKey(
			Map<String, String> specificationValues)
		throws Exception {

		return GetterUtil.getBoolean(
			specificationValues.get(
				ProductSpecificationConstants.KEY_GENERATES_ACTIVATION_KEY));
	}

	private List<EntitledProduct> _getEntitledProducts(
			List<Entitlement> entitlements)
		throws Exception {

		List<EntitledProduct> entitledProducts = new ArrayList<>();

		Set<String> externalReferenceCodes = new LinkedHashSet<>();

		for (Entitlement entitlement : entitlements) {
			if (!_grantsLicense(entitlement)) {
				continue;
			}

			Product product = fetchProduct(entitlement);

			if (product == null) {
				continue;
			}

			String externalReferenceCode = product.getExternalReferenceCode();

			if (!externalReferenceCodes.add(externalReferenceCode)) {
				continue;
			}

			Map<String, String> specificationValues =
				_commerceProductService.getSpecificationValues(
					product.getProductId());

			entitledProducts.add(
				new EntitledProduct(
					entitlement, externalReferenceCode,
					_generatesActivationKey(specificationValues),
					specificationValues.get(
						ProductSpecificationConstants.KEY_LICENSE_ENTRY_FAMILY),
					CommerceProductUtil.getName(product)));
		}

		return entitledProducts;
	}

	private String _getKeyTypeNameSuffix(String keyTypeLabel) {
		if (Validator.isNull(keyTypeLabel)) {
			return null;
		}

		for (String suffix :
				LicenseKeyGenerationConstants.KEY_TYPE_NAME_SUFFIXES) {

			if (keyTypeLabel.endsWith(suffix)) {
				return suffix;
			}
		}

		return null;
	}

	private JSONArray _getKeyTypesJSONArray(
		String licenseEntryFamily, List<ProductVersion> productVersions) {

		JSONArray jsonArray = new JSONArray();

		Set<String> names = new LinkedHashSet<>();

		for (ProductVersion productVersion : productVersions) {
			for (LicenseEntry licenseEntry :
					_getLicenseEntries(
						licenseEntryFamily, productVersion.getVersion())) {

				if (!names.add(licenseEntry.getName())) {
					continue;
				}

				jsonArray.put(
					new JSONObject(
					).put(
						"label", licenseEntry.getName()
					).put(
						"licenseEntryType", licenseEntry.getType()
					).put(
						"productKey", licenseEntry.getProductKey()
					));
			}
		}

		return jsonArray;
	}

	private List<LicenseEntry> _getLicenseEntries(
		String licenseEntryFamily, String version) {

		if (Validator.isNull(licenseEntryFamily)) {
			return new ArrayList<>();
		}

		List<LicenseEntry> licenseEntries = new ArrayList<>();

		for (LicenseEntry licenseEntry :
				_licenseEntryService.getLicenseEntriesByNameVersion(
					licenseEntryFamily + "%", toComparableVersion(version))) {

			if (ArrayUtil.contains(
					LicenseKeyGenerationConstants.
						UNSUPPORTED_LICENSE_ENTRY_TYPES,
					licenseEntry.getType()) ||
				!_isOfferedKeyType(licenseEntry.getName())) {

				continue;
			}

			licenseEntries.add(licenseEntry);
		}

		return licenseEntries;
	}

	private List<ProductVersion> _getProductVersions() {
		try {
			return _productVersionService.getProductVersions(
				LicenseKeyGenerationConstants.PRODUCT_GROUP_DXP, true);
		}
		catch (Exception exception) {
			_log.error("Unable to get the product versions", exception);

			return new ArrayList<>();
		}
	}

	private JSONArray _getSubscriptionsJSONArray(
		Entitlement entitlement, Map<Long, Integer> licenseKeyCounts) {

		JSONArray jsonArray = new JSONArray();

		int totalCount = getTotalCount(entitlement);

		int usedCount = licenseKeyCounts.getOrDefault(
			entitlement.getEntitlementId(), 0);

		int availableCount = Math.max(0, totalCount - usedCount);

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

	private boolean _grantsLicense(Entitlement entitlement) {
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

	private boolean _isOfferedKeyType(String name) {
		for (String suffix :
				LicenseKeyGenerationConstants.KEY_TYPE_NAME_SUFFIXES) {

			if (name.endsWith(suffix)) {
				return true;
			}
		}

		return false;
	}

	private boolean _leadsActivationKey(EntitledProduct entitledProduct) {
		return ArrayUtil.contains(
			LicenseKeyGenerationConstants.
				LEADING_PRODUCT_EXTERNAL_REFERENCE_CODES,
			entitledProduct.getExternalReferenceCode());
	}

	private JSONObject _toBundleProductJSONObject(
		EntitledProduct entitledProduct, boolean licensable,
		Map<Long, Integer> licenseKeyCounts) {

		Entitlement entitlement = entitledProduct.getEntitlement();

		int usedCount = licenseKeyCounts.getOrDefault(
			entitlement.getEntitlementId(), 0);

		return new JSONObject(
		).put(
			"availableCount",
			Math.max(0, getTotalCount(entitlement) - usedCount)
		).put(
			"entitlementId", entitlement.getEntitlementId()
		).put(
			"externalReferenceCode", entitledProduct.getExternalReferenceCode()
		).put(
			"licensable", licensable
		).put(
			"name", entitledProduct.getName()
		);
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
	private ProductVersionService _productVersionService;

	private final VersionComparator _versionComparator =
		new VersionComparator();

	private static class EntitledProduct {

		public EntitledProduct(
			Entitlement entitlement, String externalReferenceCode,
			boolean generatesActivationKey, String licenseEntryFamily,
			String name) {

			_entitlement = entitlement;
			_externalReferenceCode = externalReferenceCode;
			_generatesActivationKey = generatesActivationKey;
			_licenseEntryFamily = licenseEntryFamily;
			_name = name;
		}

		public Entitlement getEntitlement() {
			return _entitlement;
		}

		public String getExternalReferenceCode() {
			return _externalReferenceCode;
		}

		public String getLicenseEntryFamily() {
			return _licenseEntryFamily;
		}

		public String getName() {
			return _name;
		}

		public boolean isGeneratesActivationKey() {
			return _generatesActivationKey;
		}

		private final Entitlement _entitlement;
		private final String _externalReferenceCode;
		private final boolean _generatesActivationKey;
		private final String _licenseEntryFamily;
		private final String _name;

	}

}