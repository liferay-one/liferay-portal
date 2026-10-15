/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.constants.LicenseVersion;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.exception.LicenseKeyEntitlementException;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.util.CommerceProductUtil;
import com.liferay.one.util.KeyedLock;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.ee.license.shared.LicenseConstants;

import java.time.Instant;

import java.util.Calendar;
import java.util.Date;
import java.util.Map;
import java.util.Objects;
import java.util.TimeZone;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Ricardo Mariz
 */
@Component
public class SelfServiceTrialLicenseKeyService {

	public static String getLicenseKeyFamily(Product product) {
		return _licenseKeyFamilies.get(
			CommerceProductUtil.getSpecificationValue(
				product, ProductSpecificationConstants.KEY_SOLUTION_TYPE));
	}

	public ActivationKey addActivationKey(
			long accountEntryId, String accountName, long cProductId,
			String domains, String orderId, String owner)
		throws Exception {

		Product product = _commerceProductService.getProduct(cProductId);

		String licenseKeyFamily = getLicenseKeyFamily(product);

		if (licenseKeyFamily == null) {
			throw new LicenseKeyEntitlementException(
				"Product " + product.getExternalReferenceCode() +
					" is not a self service trial");
		}

		return _keyedLock.withLock(
			_LOCK_KEY_PREFIX + owner,
			() -> _addActivationKey(
				accountEntryId, accountName, domains, licenseKeyFamily, orderId,
				owner, product));
	}

	public boolean hasValidActivationKey(
			long cProductId, String domains, String owner)
		throws Exception {

		String licenseKeyFamily = getLicenseKeyFamily(
			_commerceProductService.getProduct(cProductId));

		if (licenseKeyFamily == null) {
			return false;
		}

		String licenseName = _getLicenseName(licenseKeyFamily);
		Instant now = Instant.now();

		for (LicenseKey licenseKey :
				_licenseKeyService.getLicenseKeys(
					domains, LicenseConstants.TYPE_DEVELOPER, owner)) {

			Instant customExpirationDateInstant =
				licenseKey.getCustomExpirationDateInstant();

			if (licenseKey.isActive() &&
				Objects.equals(
					licenseKey.getLicenseKeyFamily(), licenseKeyFamily) &&
				Objects.equals(licenseKey.getLicenseName(), licenseName) &&
				(customExpirationDateInstant != null) &&
				customExpirationDateInstant.isAfter(now)) {

				return true;
			}
		}

		return false;
	}

	private ActivationKey _addActivationKey(
			long accountEntryId, String accountName, String domains,
			String licenseKeyFamily, String orderId, String owner,
			Product product)
		throws Exception {

		Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"));

		calendar.set(Calendar.MILLISECOND, 0);

		Date startDate = calendar.getTime();

		calendar.add(
			Calendar.DATE,
			_entitlementService.getSelfServiceTrialDurationDays(
				accountEntryId));

		Date expirationDate = calendar.getTime();

		ActivationKey activationKey = _activationKeyService.addActivationKey(
			accountEntryId, true, expirationDate, licenseKeyFamily, null,
			startDate, LicenseConstants.TYPE_TRIAL);

		String productVersion =
			_productVersionService.getFreeTierProductVersion();

		try {
			_addLicenseKey(
				accountEntryId, accountName, activationKey, domains,
				expirationDate,
				LicenseKeyGenerationConstants.LICENSE_KEY_FAMILY_DXP, orderId,
				owner, product, productVersion, startDate);
			_addLicenseKey(
				accountEntryId, accountName, activationKey, domains,
				expirationDate, licenseKeyFamily, orderId, owner, product,
				productVersion, startDate);
		}
		catch (Exception exception) {
			_activationKeyService.deactivatePartialActivationKey(activationKey);

			throw exception;
		}

		return activationKey;
	}

	private void _addLicenseKey(
			long accountEntryId, String accountName,
			ActivationKey activationKey, String domains, Date expirationDate,
			String licenseKeyFamily, String orderId, String owner,
			Product product, String productVersion, Date startDate)
		throws Exception {

		String name = _getLicenseName(licenseKeyFamily);
		String productName = _productNames.get(licenseKeyFamily);

		_licenseKeyService.addLicenseKey(
			accountEntryId, accountName, activationKey.getActivationKeyId(),
			true, null, product.getExternalReferenceCode(), false, null, name,
			domains, 0, 0, expirationDate, null, null, null, licenseKeyFamily,
			name, LicenseConstants.TYPE_DEVELOPER,
			LicenseVersion.getLicenseVersion(productName, productVersion), null,
			0, 0, LicenseKeyGenerationConstants.DEVELOPER_MAX_HTTP_SESSIONS, 0,
			0, name, orderId, owner, LicenseConstants.PRODUCT_ID_PORTAL,
			productName, productVersion, null, null, StringPool.BLANK,
			startDate, null, null);
	}

	private String _getLicenseName(String licenseKeyFamily) {
		return _productNames.get(licenseKeyFamily) + " Trial";
	}

	private static final String _LOCK_KEY_PREFIX = "self-service-trial-";

	private static final Map<String, String> _licenseKeyFamilies = Map.of(
		ProductSpecificationConstants.SOLUTION_TYPE_CMP_TRIAL,
		LicenseKeyGenerationConstants.LICENSE_KEY_FAMILY_CMP,
		ProductSpecificationConstants.SOLUTION_TYPE_DSR_TRIAL,
		LicenseKeyGenerationConstants.LICENSE_KEY_FAMILY_DSR);
	private static final Map<String, String> _productNames = Map.of(
		LicenseKeyGenerationConstants.LICENSE_KEY_FAMILY_CMP,
		"Content Marketing Platform",
		LicenseKeyGenerationConstants.LICENSE_KEY_FAMILY_DSR,
		"Digital Sales Room",
		LicenseKeyGenerationConstants.LICENSE_KEY_FAMILY_DXP, "Liferay DXP");

	@Autowired
	private ActivationKeyService _activationKeyService;

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private KeyedLock _keyedLock;

	@Autowired
	private LicenseKeyService _licenseKeyService;

	@Autowired
	private ProductVersionService _productVersionService;

}