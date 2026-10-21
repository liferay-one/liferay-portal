/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.exception.LicenseKeyEntitlementException;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.util.CommerceProductUtil;
import com.liferay.one.util.KeyedLock;
import com.liferay.one.util.ServerInfoUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.ListUtil;
import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Ryan Schuhler
 */
@Component
public class AppLicenseKeyGenerationService {

	public ActivationKey generateActivationKey(
			Account account,
			LicenseKeyGenerationService.GenerateRequest generateRequest,
			String owner)
		throws Exception {

		if (ListUtil.isEmpty(generateRequest.getServers())) {
			throw new LicenseKeyEntitlementException(
				"No server was given for the activation keys");
		}

		if (Validator.isNotNull(
				generateRequest.
					getRenewedActivationKeyExternalReferenceCode())) {

			throw new LicenseKeyEntitlementException(
				"A Marketplace app key cannot be renewed");
		}

		return _keyedLock.withLock(
			_LOCK_KEY_PREFIX + account.getId(),
			() -> _generateActivationKey(account, generateRequest, owner));
	}

	public JSONObject getGenerateForm(long accountEntryId) throws Exception {
		Map<Long, Integer> licenseKeyCounts =
			_licenseKeyService.getActiveUnassignedLicenseKeyCounts(
				accountEntryId);

		Map<String, JSONObject> productJSONObjects = new LinkedHashMap<>();

		for (AppEntitlement appEntitlement :
				_getAppEntitlements(accountEntryId)) {

			JSONObject productJSONObject = productJSONObjects.computeIfAbsent(
				appEntitlement._getExternalReferenceCode(),
				externalReferenceCode -> _toProductJSONObject(appEntitlement));

			JSONObject keyTypeJSONObject = _getKeyTypeJSONObject(
				appEntitlement, productJSONObject.getJSONArray("keyTypes"));

			keyTypeJSONObject.getJSONArray(
				"subscriptions"
			).put(
				_toSubscriptionJSONObject(appEntitlement, licenseKeyCounts)
			);
		}

		return new JSONObject(
		).put(
			"bundleProducts", new JSONArray()
		).put(
			"products", new JSONArray(productJSONObjects.values())
		);
	}

	public JSONObject getSummary(long accountEntryId, boolean provisionable)
		throws Exception {

		boolean generatable = false;

		if (provisionable) {
			Map<Long, Integer> licenseKeyCounts =
				_licenseKeyService.getActiveUnassignedLicenseKeyCounts(
					accountEntryId);

			for (AppEntitlement appEntitlement :
					_getAppEntitlements(accountEntryId)) {

				if (_getAvailableCount(appEntitlement, licenseKeyCounts) > 0) {
					generatable = true;

					break;
				}
			}
		}

		return new JSONObject(
		).put(
			"cloudNativeKeyTypes", new JSONArray()
		).put(
			"generatable", generatable
		).put(
			"provisionable", provisionable
		);
	}

	private void _checkQuota(
			AppEntitlement appEntitlement, long accountEntryId,
			int requestedCount)
		throws Exception {

		int availableCount = _getAvailableCount(
			appEntitlement,
			_licenseKeyService.getActiveUnassignedLicenseKeyCounts(
				accountEntryId));

		if (requestedCount > availableCount) {
			Entitlement entitlement = appEntitlement._getEntitlement();

			throw new LicenseKeyEntitlementException(
				StringBundler.concat(
					"Entitlement ", entitlement.getName(), " has ",
					availableCount, " activations left, but ", requestedCount,
					" were requested"));
		}
	}

	private ActivationKey _generateActivationKey(
			Account account,
			LicenseKeyGenerationService.GenerateRequest generateRequest,
			String owner)
		throws Exception {

		long accountEntryId = account.getId();

		AppEntitlement appEntitlement = null;

		for (AppEntitlement curAppEntitlement :
				_getAppEntitlements(accountEntryId)) {

			Entitlement entitlement = curAppEntitlement._getEntitlement();

			if (entitlement.getEntitlementId() ==
					generateRequest.getSubscriptionEntitlementId()) {

				appEntitlement = curAppEntitlement;

				break;
			}
		}

		if (appEntitlement == null) {
			throw new LicenseKeyEntitlementException(
				"The account is not entitled to the selected subscription");
		}

		if (!Objects.equals(
				appEntitlement._getKeyType(), generateRequest.getKeyType())) {

			throw new LicenseKeyEntitlementException(
				"The selected subscription does not grant key type " +
					generateRequest.getKeyType());
		}

		List<LicenseKeyGenerationService.GenerateRequest.Server> servers =
			generateRequest.getServers();

		_checkQuota(appEntitlement, accountEntryId, servers.size());

		Entitlement entitlement = appEntitlement._getEntitlement();

		Date startDate = _getStartDate(entitlement);

		Date expirationDate = _getExpirationDate(entitlement, startDate);

		String name = generateRequest.getEnvironmentName();

		if (Validator.isNull(name)) {
			name = appEntitlement._getProductName();
		}

		String description = generateRequest.getDescription();

		if (Validator.isNull(description)) {
			description = name;
		}

		String licenseKeyFamily =
			LicenseKeyGenerateFormService.getLicenseKeyFamily(entitlement);

		ActivationKey activationKey = _activationKeyService.addActivationKey(
			accountEntryId, true, expirationDate, licenseKeyFamily, null,
			startDate, appEntitlement._getKeyType());

		try {
			for (LicenseKeyGenerationService.GenerateRequest.Server server :
					servers) {

				_licenseKeyService.addLicenseKey(
					accountEntryId, account.getName(),
					activationKey.getActivationKeyId(), true, null, false, null,
					description, StringPool.BLANK,
					entitlement.getEntitlementDefinitionId(),
					entitlement.getEntitlementId(), expirationDate,
					ServerInfoUtil.toCommaSeparated(server.getHostName()),
					ServerInfoUtil.toCommaSeparated(server.getIpAddresses()),
					null, licenseKeyFamily, StringPool.BLANK,
					appEntitlement._getKeyType(), _LICENSE_VERSION,
					ServerInfoUtil.toCommaSeparated(server.getMacAddresses()),
					0, 0, 0, 0, 0, name, null, owner,
					appEntitlement._getProductExternalId(),
					appEntitlement._getProductName(),
					appEntitlement._getProductVersion(), null, StringPool.BLANK,
					StringPool.BLANK, startDate, null, null);
			}
		}
		catch (Exception exception) {
			_activationKeyService.deactivatePartialActivationKey(activationKey);

			throw exception;
		}

		return activationKey;
	}

	private List<AppEntitlement> _getAppEntitlements(long accountEntryId)
		throws Exception {

		List<AppEntitlement> appEntitlements = new ArrayList<>();

		Map<Long, Boolean> completedOrders = new HashMap<>();
		Map<String, Product> products = new HashMap<>();

		for (Entitlement entitlement :
				_entitlementService.getActiveUnassignedEntitlements(
					accountEntryId)) {

			EntitlementDefinition entitlementDefinition =
				entitlement.getEntitlementDefinition();

			if (entitlementDefinition == null) {
				continue;
			}

			String skuExternalReferenceCode =
				entitlement.getSkuExternalReferenceCode();

			if (Validator.isNull(skuExternalReferenceCode)) {
				continue;
			}

			Product product = products.get(skuExternalReferenceCode);

			if ((product == null) &&
				!products.containsKey(skuExternalReferenceCode)) {

				product = _licenseKeyGenerateFormService.fetchProduct(
					entitlement);

				products.put(skuExternalReferenceCode, product);
			}

			if (!_isLicensableApp(entitlement, product) ||
				!_isOrderCompleted(completedOrders, entitlement)) {

				continue;
			}

			appEntitlements.add(
				new AppEntitlement(
					entitlement, _getKeyType(entitlementDefinition), product));
		}

		return appEntitlements;
	}

	private int _getAvailableCount(
		AppEntitlement appEntitlement, Map<Long, Integer> licenseKeyCounts) {

		Entitlement entitlement = appEntitlement._getEntitlement();

		int usedCount = licenseKeyCounts.getOrDefault(
			entitlement.getEntitlementId(), 0);

		return Math.max(0, _getTotalCount(entitlement) - usedCount);
	}

	private Date _getExpirationDate(Entitlement entitlement, Date startDate) {
		Instant endDateInstant = entitlement.getEndDateInstant();

		if (endDateInstant != null) {
			return Date.from(endDateInstant);
		}

		ZonedDateTime zonedDateTime = ZonedDateTime.ofInstant(
			startDate.toInstant(), ZoneOffset.UTC);

		return Date.from(
			zonedDateTime.plusYears(
				_PERPETUAL_YEARS
			).toInstant());
	}

	private String _getKeyType(EntitlementDefinition entitlementDefinition) {
		String licenseKeyType = entitlementDefinition.getLicenseKeyType();

		if (Validator.isNull(licenseKeyType)) {
			return LicenseKeyGenerationConstants.KEY_TYPE_PRODUCTION;
		}

		return licenseKeyType;
	}

	private JSONObject _getKeyTypeJSONObject(
		AppEntitlement appEntitlement, JSONArray keyTypesJSONArray) {

		for (int i = 0; i < keyTypesJSONArray.length(); i++) {
			JSONObject keyTypeJSONObject = keyTypesJSONArray.getJSONObject(i);

			if (Objects.equals(
					appEntitlement._getKeyType(),
					keyTypeJSONObject.getString("key"))) {

				return keyTypeJSONObject;
			}
		}

		Entitlement entitlement = appEntitlement._getEntitlement();

		JSONObject keyTypeJSONObject = new JSONObject(
		).put(
			"entitlementId", entitlement.getEntitlementId()
		).put(
			"key", appEntitlement._getKeyType()
		).put(
			"licenseEntryType", appEntitlement._getKeyType()
		).put(
			"productKey", appEntitlement._getExternalReferenceCode()
		).put(
			"subscriptions", new JSONArray()
		);

		keyTypesJSONArray.put(keyTypeJSONObject);

		return keyTypeJSONObject;
	}

	private Date _getStartDate(Entitlement entitlement) {
		Instant startDateInstant = entitlement.getStartDateInstant();

		if (startDateInstant == null) {
			startDateInstant = Instant.now(
			).truncatedTo(
				ChronoUnit.SECONDS
			);
		}

		return Date.from(startDateInstant);
	}

	private int _getTotalCount(Entitlement entitlement) {
		Double count = entitlement.getMaxQuantity();

		if (count == null) {
			count = entitlement.getQuantity();
		}

		if (count == null) {
			return 0;
		}

		return count.intValue();
	}

	private boolean _isLicensableApp(Entitlement entitlement, Product product) {
		if ((product == null) ||
			LicenseKeyGenerateFormService.isLeadingLicenseKeyFamily(
				LicenseKeyGenerateFormService.getLicenseKeyFamily(
					entitlement)) ||
			!Objects.equals(
				CommerceProductUtil.getSpecificationValue(
					product, ProductSpecificationConstants.KEY_PRICE_MODEL),
				ProductSpecificationConstants.PRICE_MODEL_PAID)) {

			return false;
		}

		return ProductSpecificationConstants.licensableAppTypes.contains(
			CommerceProductUtil.getSpecificationValue(
				product, ProductSpecificationConstants.KEY_TYPE));
	}

	private boolean _isOrderCompleted(
			Map<Long, Boolean> completedOrders, Entitlement entitlement)
		throws Exception {

		long commerceOrderItemId = entitlement.getCommerceOrderItemId();

		if (commerceOrderItemId == 0) {
			return true;
		}

		OrderItem orderItem = _commerceOrderItemService.fetchCommerceOrderItem(
			commerceOrderItemId);

		if ((orderItem == null) || (orderItem.getOrderId() == null)) {
			return false;
		}

		Boolean completed = completedOrders.get(orderItem.getOrderId());

		if (completed != null) {
			return completed;
		}

		Order order = _commerceOrderService.fetchCommerceOrder(
			orderItem.getOrderId());

		completed =
			(order != null) &&
			Objects.equals(
				order.getOrderStatus(),
				CommerceOrderConstants.ORDER_STATUS_COMPLETED);

		completedOrders.put(orderItem.getOrderId(), completed);

		return completed;
	}

	private JSONObject _toProductJSONObject(AppEntitlement appEntitlement) {
		Entitlement entitlement = appEntitlement._getEntitlement();

		return new JSONObject(
		).put(
			"developerVersions", new JSONArray()
		).put(
			"entitlementId", entitlement.getEntitlementId()
		).put(
			"externalReferenceCode", appEntitlement._getExternalReferenceCode()
		).put(
			"keyTypes", new JSONArray()
		).put(
			"licenseKeyFamily",
			LicenseKeyGenerateFormService.getLicenseKeyFamily(entitlement)
		).put(
			"name", appEntitlement._getProductName()
		).put(
			"versions",
			new JSONArray(
			).put(
				appEntitlement._getProductVersion()
			)
		);
	}

	private JSONObject _toSubscriptionJSONObject(
		AppEntitlement appEntitlement, Map<Long, Integer> licenseKeyCounts) {

		Entitlement entitlement = appEntitlement._getEntitlement();

		return new JSONObject(
		).put(
			"availableCount",
			_getAvailableCount(appEntitlement, licenseKeyCounts)
		).put(
			"endDate",
			LicenseKeyGenerateFormService.toISO8601(
				entitlement.getEndDateInstant())
		).put(
			"entitlementId", entitlement.getEntitlementId()
		).put(
			"instanceSize", _INSTANCE_SIZE_DEFAULT
		).put(
			"startDate",
			LicenseKeyGenerateFormService.toISO8601(
				entitlement.getStartDateInstant())
		).put(
			"totalCount", _getTotalCount(entitlement)
		);
	}

	private static final int _INSTANCE_SIZE_DEFAULT = 1;

	private static final int _LICENSE_VERSION = 3;

	private static final String _LOCK_KEY_PREFIX = "account-";

	private static final int _PERPETUAL_YEARS = 100;

	private static final String _PRODUCT_VERSION_DEFAULT = "1";

	@Autowired
	private ActivationKeyService _activationKeyService;

	@Autowired
	private CommerceOrderItemService _commerceOrderItemService;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private KeyedLock _keyedLock;

	@Autowired
	private LicenseKeyGenerateFormService _licenseKeyGenerateFormService;

	@Autowired
	private LicenseKeyService _licenseKeyService;

	private static class AppEntitlement {

		private AppEntitlement(
			Entitlement entitlement, String keyType, Product product) {

			_entitlement = entitlement;
			_keyType = keyType;
			_product = product;
		}

		private Entitlement _getEntitlement() {
			return _entitlement;
		}

		private String _getExternalReferenceCode() {
			return _product.getExternalReferenceCode();
		}

		private String _getKeyType() {
			return _keyType;
		}

		private String _getProductExternalId() {
			String appEntryUuid = CommerceProductUtil.getSpecificationValue(
				_product, ProductSpecificationConstants.KEY_APP_ENTRY_UUID);

			if (Validator.isNotNull(appEntryUuid)) {
				return appEntryUuid;
			}

			return _getExternalReferenceCode();
		}

		private String _getProductName() {
			return CommerceProductUtil.getName(_product);
		}

		private String _getProductVersion() {
			String latestVersion = CommerceProductUtil.getSpecificationValue(
				_product, ProductSpecificationConstants.KEY_LATEST_VERSION);

			if (Validator.isNotNull(latestVersion)) {
				return latestVersion;
			}

			return _PRODUCT_VERSION_DEFAULT;
		}

		private final Entitlement _entitlement;
		private final String _keyType;
		private final Product _product;

	}

}