/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductVirtualSettingsFileEntry;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.constants.LicenseVersion;
import com.liferay.one.constants.ProductVersion;
import com.liferay.one.exception.CloudNativeEntitlementException;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.Environment;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.Time;

import java.time.Instant;

import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/**
 * @author Kyle Bischof
 * @author Amos Fong
 */
@Component
public class CloudNativeManifestService {

	public JSONArray getAddOnsJSONArray(
			String dxpVersion, Environment environment)
		throws Exception {

		return _getAddOnsJSONArray(
			_getCloudEnabledProducts(
				_entitlementService.getActiveEntitlements(
					environment.getAccountEntryId())),
			ProductVersion.extractQuarterlyPatchRelease(dxpVersion));
	}

	public JSONObject getManifestJSONObject(
			String dxpVersion, Environment environment)
		throws Exception {

		List<Entitlement> entitlements =
			_entitlementService.getActiveEntitlements(
				environment.getAccountEntryId());

		Entitlement cloudNativeEntitlement = null;

		for (Entitlement entitlement : entitlements) {
			if (ArrayUtil.contains(
					EnvironmentConstants.NAMES_CLOUD_NATIVE,
					entitlement.getName())) {

				cloudNativeEntitlement = entitlement;

				break;
			}
		}

		if (cloudNativeEntitlement == null) {
			throw new CloudNativeEntitlementException(
				environment.getAccountEntryId());
		}

		Date expirationDate = _toDate(
			cloudNativeEntitlement.getEndDateInstant(),
			new Date(System.currentTimeMillis() + Time.YEAR));
		Date startDate = _toDate(
			cloudNativeEntitlement.getStartDateInstant(), new Date());

		int maxClusterNodes = _getMaxClusterNodes(
			entitlements, environment.getEnvironmentType());

		JSONArray addOnsJSONArray = _getAddOnsJSONArray(
			_getCloudEnabledProducts(entitlements),
			ProductVersion.extractQuarterlyPatchRelease(dxpVersion));

		String licenseEntryName =
			EnvironmentConstants.
				LICENSE_ENTRY_NAME_DXP_NONPRODUCTION_VIRTUAL_CLUSTER;

		if (Objects.equals(
				environment.getEnvironmentType(),
				EnvironmentConstants.ENVIRONMENT_TYPE_PRODUCTION)) {

			licenseEntryName =
				EnvironmentConstants.
					LICENSE_ENTRY_NAME_DXP_PRODUCTION_VIRTUAL_CLUSTER;
		}

		return new JSONObject(
		).put(
			"add-ons", addOnsJSONArray
		).put(
			"licenseXML",
			_getAggregateLicenseXML(
				addOnsJSONArray, _getAccountName(environment),
				ProductVersion.extractQuarterlyRelease(dxpVersion),
				expirationDate, licenseEntryName, maxClusterNodes,
				environment.getExternalReferenceCode(), startDate)
		).put(
			"maxClusterNodes", maxClusterNodes
		);
	}

	private String _generateAppLicenseXML(
			Date expirationDate, String owner, String productId,
			String productName, Date startDate)
		throws Exception {

		String description = productName + " Cloud Native Environment";
		String licenseEntryType = LicenseConstants.TYPE_ENTERPRISE;
		int licenseVersion = LicenseVersion.getAppLicenseVersion();

		String key = _licenseKeyGenerator.generateKey(
			StringPool.BLANK, StringPool.BLANK, licenseEntryType,
			licenseVersion, productName, productId, _APP_PRODUCT_VERSION, owner,
			0, 0, 0, 0, 0, StringPool.BLANK, description, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, startDate, expirationDate);

		return _licenseKeyExporter.toXML(
			key, StringPool.BLANK, StringPool.BLANK, licenseEntryType,
			licenseVersion, productName, productId, _APP_PRODUCT_VERSION, owner,
			0, 0, 0, 0, 0, StringPool.BLANK, description, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, startDate, expirationDate);
	}

	private String _generateDXPLicenseXML(
			String accountName, Date expirationDate, String licenseEntryName,
			int maxClusterNodes, String owner, String productVersion,
			Date startDate)
		throws Exception {

		String description =
			EnvironmentConstants.LICENSE_DESCRIPTION_CLOUD_NATIVE;
		String licenseEntryType = LicenseConstants.TYPE_VIRTUAL_CLUSTER;
		int licenseVersion = LicenseVersion.getLicenseVersion(
			EnvironmentConstants.PRODUCT_NAME_DXP_PRODUCTION, productVersion);
		String sizing = EnvironmentConstants.LICENSE_SIZING_4;

		String key = _licenseKeyGenerator.generateKey(
			accountName, licenseEntryName, licenseEntryType, licenseVersion,
			EnvironmentConstants.PRODUCT_NAME_DXP_PRODUCTION,
			EnvironmentConstants.PRODUCT_ID_PORTAL, productVersion, owner,
			maxClusterNodes, 0, 0, 0, 0, sizing, description, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, startDate, expirationDate);

		return _licenseKeyExporter.toXML(
			key, accountName, licenseEntryName, licenseEntryType,
			licenseVersion, EnvironmentConstants.PRODUCT_NAME_DXP_PRODUCTION,
			EnvironmentConstants.PRODUCT_ID_PORTAL, productVersion, owner,
			maxClusterNodes, 0, 0, 0, 0, sizing, description, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, startDate, expirationDate);
	}

	private String _getAccountName(Environment environment) throws Exception {
		Account account = _accountService.fetchAccount(
			environment.getAccountEntryId());

		if (account == null) {
			return StringPool.BLANK;
		}

		return account.getName();
	}

	private JSONArray _getAddOnsJSONArray(
			List<Product> cloudEnabledProducts, String dxpPatchProductVersion)
		throws Exception {

		JSONArray jsonArray = new JSONArray();

		for (Product product : cloudEnabledProducts) {
			try {
				ProductVirtualSettingsFileEntry
					productVirtualSettingsFileEntry =
						_commerceProductVirtualSettingsService.
							fetchProductVirtualSettingsFileEntry(
								product.getProductId(), dxpPatchProductVersion);

				if (productVirtualSettingsFileEntry == null) {
					throw new Exception(
						"No package is available for product " +
							product.getExternalReferenceCode());
				}

				jsonArray.put(
					new JSONObject(
					).put(
						"downloadURL",
						ServletUriComponentsBuilder.fromCurrentContextPath(
						).path(
							"/cloud/products/{externalReferenceCode}" +
								"/virtual-entry/{virtualEntryId}/download"
						).buildAndExpand(
							product.getExternalReferenceCode(),
							productVirtualSettingsFileEntry.getId()
						).toUriString()
					).put(
						"productId", product.getExternalReferenceCode()
					).put(
						"productName", _commerceProductService.getName(product)
					).put(
						"sha256Checksum",
						_commerceProductVirtualSettingsService.
							getSHA256Checksum(
								productVirtualSettingsFileEntry.getSrc())
					).put(
						"version", productVirtualSettingsFileEntry.getVersion()
					).put(
						"virtualEntryId",
						productVirtualSettingsFileEntry.getId()
					));
			}
			catch (Exception exception) {
				_log.error(
					"Unable to resolve the add on package for product " +
						product.getExternalReferenceCode(),
					exception);
			}
		}

		return jsonArray;
	}

	private String _getAggregateLicenseXML(
			JSONArray addOnsJSONArray, String accountName,
			String dxpProductVersion, Date expirationDate,
			String licenseEntryName, int maxClusterNodes, String owner,
			Date startDate)
		throws Exception {

		List<String> licenseXMLs = new ArrayList<>();

		for (int i = 0; i < addOnsJSONArray.length(); i++) {
			JSONObject addOnJSONObject = addOnsJSONArray.getJSONObject(i);

			licenseXMLs.add(
				_generateAppLicenseXML(
					expirationDate, accountName,
					addOnJSONObject.getString("productId"),
					addOnJSONObject.getString("productName"), startDate));
		}

		licenseXMLs.add(
			_generateDXPLicenseXML(
				accountName, expirationDate, licenseEntryName, maxClusterNodes,
				owner, dxpProductVersion, startDate));

		String licenseXML = _licenseKeyExporter.aggregateXMLs(
			licenseXMLs.toArray(new String[0]));

		Base64.Encoder encoder = Base64.getEncoder();

		return encoder.encodeToString(licenseXML.getBytes());
	}

	private List<Product> _getCloudEnabledProducts(
			List<Entitlement> entitlements)
		throws Exception {

		List<Product> products = new ArrayList<>();

		for (Entitlement entitlement : entitlements) {
			EntitlementDefinition entitlementDefinition =
				entitlement.getEntitlementDefinition();

			if (entitlementDefinition == null) {
				continue;
			}

			long cProductId = entitlementDefinition.getCProductId();

			if (cProductId <= 0) {
				continue;
			}

			Product product = _commerceProductService.fetchCloudEnabledProduct(
				cProductId);

			if (product != null) {
				products.add(product);
			}
		}

		return products;
	}

	private int _getMaxClusterNodes(
		List<Entitlement> entitlements, String environmentType) {

		int maxClusterNodes = 1;

		if (!_hasProductionSizing(environmentType)) {
			return maxClusterNodes;
		}

		for (Entitlement entitlement : entitlements) {
			if (!ArrayUtil.contains(
					EnvironmentConstants.NAMES_PRODUCTION_PODS,
					entitlement.getName())) {

				continue;
			}

			Double quantity = entitlement.getQuantity();

			if (quantity == null) {
				continue;
			}

			int curMaxClusterNodes = quantity.intValue();

			if (curMaxClusterNodes > maxClusterNodes) {
				maxClusterNodes = curMaxClusterNodes;
			}
		}

		return maxClusterNodes;
	}

	private boolean _hasProductionSizing(String environmentType) {
		if (Objects.equals(
				environmentType,
				EnvironmentConstants.ENVIRONMENT_TYPE_PRODUCTION) ||
			Objects.equals(
				environmentType, EnvironmentConstants.ENVIRONMENT_TYPE_UAT)) {

			return true;
		}

		return false;
	}

	private Date _toDate(Instant instant, Date defaultDate) {
		if (instant == null) {
			return defaultDate;
		}

		return Date.from(instant);
	}

	private static final String _APP_PRODUCT_VERSION = "1";

	private static final Log _log = LogFactory.getLog(
		CloudNativeManifestService.class);

	@Autowired
	private AccountService _accountService;

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private CommerceProductVirtualSettingsService
		_commerceProductVirtualSettingsService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private LicenseKeyExporter _licenseKeyExporter;

	@Autowired
	private LicenseKeyGenerator _licenseKeyGenerator;

}