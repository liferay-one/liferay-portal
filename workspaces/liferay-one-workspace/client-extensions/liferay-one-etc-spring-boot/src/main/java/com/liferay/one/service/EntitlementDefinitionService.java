/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.constants.SkuOptionConstants;
import com.liferay.one.constants.TaxonomyCategoryConstants;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.util.CommerceOrderUtil;
import com.liferay.one.util.CommerceProductUtil;
import com.liferay.one.util.CommerceSkuUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;
import com.liferay.portal.kernel.workflow.WorkflowConstants;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Felipe Veloso
 */
@Component
public class EntitlementDefinitionService extends OneBaseService {

	public EntitlementDefinition fetchEntitlementDefinition(
			String externalReferenceCode)
		throws Exception {

		List<EntitlementDefinition> entitlementDefinitions =
			getEntitlementDefinitions(
				"externalReferenceCode eq '" +
					escapeODataString(externalReferenceCode) + "'");

		if (entitlementDefinitions.isEmpty()) {
			return null;
		}

		return entitlementDefinitions.get(0);
	}

	public void generateEntitlementDefinition(long cProductId)
		throws Exception {

		Product product = _commerceProductService.getProduct(cProductId);

		if (!_isPaidApp(product)) {
			return;
		}

		String productName = CommerceProductUtil.getName(product);

		if (Validator.isNull(productName)) {
			if (_log.isWarnEnabled()) {
				_log.warn("Unable to find the name of product " + cProductId);
			}

			return;
		}

		for (Sku sku : _commerceSkuService.getSkus(cProductId)) {
			if (!CommerceSkuUtil.hasLicenseUsageTypeOption(sku)) {
				continue;
			}

			try {
				_syncEntitlementDefinition(productName, sku);
			}
			catch (Exception exception) {
				_log.error(
					"Unable to sync the entitlement definition for SKU " +
						sku.getExternalReferenceCode(),
					exception);
			}
		}
	}

	public List<EntitlementDefinition> getEntitlementDefinitions(
			Map<String, String> productOptions, String skuExternalReferenceCode)
		throws Exception {

		List<EntitlementDefinition> entitlementDefinitions =
			getSkuEntitlementDefinitions(skuExternalReferenceCode);

		entitlementDefinitions.removeIf(
			entitlementDefinition ->
				!entitlementDefinition.isActive() ||
				!_matches(
					entitlementDefinition.getProductOptions(), productOptions));

		return entitlementDefinitions;
	}

	public List<EntitlementDefinition> getEntitlementDefinitions(
			String filterString)
		throws Exception {

		return getAllItems(
			"/o/c/entitlementdefinitions", filterString,
			EntitlementDefinition::new);
	}

	public List<EntitlementDefinition> getSkuEntitlementDefinitions(
			String skuExternalReferenceCode)
		throws Exception {

		if (Validator.isNull(skuExternalReferenceCode)) {
			return Collections.emptyList();
		}

		String filterString =
			"skuExternalReferenceCode eq '" +
				escapeODataString(skuExternalReferenceCode) + "'";

		List<Long> entitlementDefinitionIds = new ArrayList<>();

		for (JSONObject jsonObject :
				getAllItems(
					"/o/c/entitlementdefinitionskus", filterString,
					jsonObject -> jsonObject)) {

			long entitlementDefinitionId = jsonObject.optLong(
				"r_entitlementDefinitionToSku_c_entitlementDefinitionId");

			if (entitlementDefinitionId > 0) {
				entitlementDefinitionIds.add(entitlementDefinitionId);
			}
		}

		Map<Long, EntitlementDefinition> entitlementDefinitions =
			new LinkedHashMap<>();

		if (!entitlementDefinitionIds.isEmpty()) {
			String entitlementDefinitionIdsString = StringUtil.merge(
				entitlementDefinitionIds, "','");

			for (EntitlementDefinition entitlementDefinition :
					getEntitlementDefinitions(
						"id in ('" + entitlementDefinitionIdsString + "')")) {

				entitlementDefinitions.put(
					entitlementDefinition.getEntitlementDefinitionId(),
					entitlementDefinition);
			}
		}

		for (EntitlementDefinition entitlementDefinition :
				getEntitlementDefinitions(filterString)) {

			entitlementDefinitions.putIfAbsent(
				entitlementDefinition.getEntitlementDefinitionId(),
				entitlementDefinition);
		}

		return new ArrayList<>(entitlementDefinitions.values());
	}

	@Scheduled(cron = "${liferay.one.entitlement.definition.reconcile.cron}")
	public void reconcileEntitlementDefinitions() {
		if (!_reconciling.compareAndSet(false, true)) {
			return;
		}

		try {
			List<Long> cProductIds = getAllItems(
				"/o/headless-commerce-admin-catalog/v1.0/products", null,
				jsonObject -> {
					if (jsonObject.optInt("productStatus", -1) !=
							WorkflowConstants.STATUS_APPROVED) {

						return null;
					}

					return jsonObject.optLong("productId");
				});

			cProductIds.removeIf(Objects::isNull);

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Reconciling entitlement definitions for ",
						cProductIds.size(), " approved products"));
			}

			for (Long cProductId : cProductIds) {
				try {
					generateEntitlementDefinition(cProductId);
				}
				catch (Exception exception) {
					_log.error(
						"Unable to reconcile entitlement definitions for " +
							"product " + cProductId,
						exception);
				}
			}

			_deactivateOrphanedEntitlementDefinitions();
		}
		catch (Exception exception) {
			_log.error(
				"Unable to reconcile entitlement definitions", exception);
		}
		finally {
			_reconciling.set(false);
		}
	}

	private void _addEntitlementDefinition(
			String name, String skuExternalReferenceCode, boolean trial)
		throws Exception {

		JSONObject entitlementDefinitionJSONObject = new JSONObject(
		).put(
			"active", true
		).put(
			"defaultQuantity", 1
		).put(
			"displayName", name
		).put(
			"name", name
		).put(
			"skuExternalReferenceCode", skuExternalReferenceCode
		);

		if (trial) {
			entitlementDefinitionJSONObject.put(
				"licenseKeyDurationDays", _TRIAL_LICENSE_KEY_DURATION_DAYS);
		}

		put(
			getAuthorization(), entitlementDefinitionJSONObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/entitlementdefinitions/by-external-reference-code" +
					"/{externalReferenceCode}"
			).encode(
			).buildAndExpand(
				skuExternalReferenceCode
			).toUri());

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Generated the entitlement definition \"", name,
					"\" for SKU ", skuExternalReferenceCode));
		}
	}

	private void _addEntitlementDefinitionSku(
			String entitlementDefinitionExternalReferenceCode,
			String skuExternalReferenceCode)
		throws Exception {

		JSONObject jsonObject = new JSONObject(
		).put(
			"r_entitlementDefinitionToSku_c_entitlementDefinitionERC",
			entitlementDefinitionExternalReferenceCode
		).put(
			"skuExternalReferenceCode", skuExternalReferenceCode
		);

		put(
			getAuthorization(), jsonObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/entitlementdefinitionskus/by-external-reference-code" +
					"/{externalReferenceCode}"
			).encode(
			).buildAndExpand(
				StringBundler.concat(
					entitlementDefinitionExternalReferenceCode, "_",
					skuExternalReferenceCode)
			).toUri());
	}

	private void _deactivateOrphanedEntitlementDefinitions() throws Exception {
		for (EntitlementDefinition entitlementDefinition :
				getEntitlementDefinitions("active eq true")) {

			String skuExternalReferenceCode =
				entitlementDefinition.getSkuExternalReferenceCode();

			if (Validator.isNull(skuExternalReferenceCode) ||
				!Objects.equals(
					entitlementDefinition.getExternalReferenceCode(),
					skuExternalReferenceCode)) {

				continue;
			}

			try {
				Sku sku = _commerceSkuService.fetchSku(
					skuExternalReferenceCode);

				if (sku != null) {
					continue;
				}

				_patchEntitlementDefinition(
					new JSONObject(
					).put(
						"active", false
					),
					skuExternalReferenceCode);

				if (_log.isInfoEnabled()) {
					_log.info(
						StringBundler.concat(
							"Deactivated the orphaned entitlement definition ",
							skuExternalReferenceCode,
							" because its SKU no longer exists"));
				}
			}
			catch (Exception exception) {
				_log.error(
					"Unable to deactivate the orphaned entitlement " +
						"definition " + skuExternalReferenceCode,
					exception);
			}
		}
	}

	private boolean _isPaidApp(Product product) {
		List<String> categoryExternalReferenceCodes =
			CommerceProductUtil.getCategoryExternalReferenceCodes(product);

		if (categoryExternalReferenceCodes.contains(
				TaxonomyCategoryConstants.EXTERNAL_REFERENCE_CODE_APP) &&
			Objects.equals(
				CommerceProductUtil.getSpecificationValue(
					product, ProductSpecificationConstants.KEY_PRICE_MODEL),
				ProductSpecificationConstants.PRICE_MODEL_PAID)) {

			return true;
		}

		return false;
	}

	private boolean _isTrial(Sku sku) {
		return StringUtil.equalsIgnoreCase(
			CommerceOrderUtil.getSkuOptionValue(
				SkuOptionConstants.KEY_SUFFIX_LICENSE_USAGE_TYPE,
				sku.getSkuOptions()),
			"trial");
	}

	private boolean _matches(
		Map<String, String> entitlementDefinitionProductOptions,
		Map<String, String> productOptions) {

		for (Map.Entry<String, String> entry :
				entitlementDefinitionProductOptions.entrySet()) {

			String value = entry.getValue();

			if (!value.equals(productOptions.get(entry.getKey()))) {
				return false;
			}
		}

		return true;
	}

	private void _patchEntitlementDefinition(
			JSONObject entitlementDefinitionJSONObject,
			String externalReferenceCode)
		throws Exception {

		patch(
			getAuthorization(), entitlementDefinitionJSONObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/entitlementdefinitions/by-external-reference-code" +
					"/{externalReferenceCode}"
			).encode(
			).buildAndExpand(
				externalReferenceCode
			).toUri());
	}

	private void _syncEntitlementDefinition(String productName, Sku sku)
		throws Exception {

		String skuExternalReferenceCode = sku.getExternalReferenceCode();

		List<EntitlementDefinition> entitlementDefinitions =
			getSkuEntitlementDefinitions(skuExternalReferenceCode);

		String name = StringBundler.concat(productName, " - ", sku.getSku());

		EntitlementDefinition generatedEntitlementDefinition = null;
		boolean manualEntitlementDefinition = false;

		for (EntitlementDefinition entitlementDefinition :
				entitlementDefinitions) {

			if (Objects.equals(
					entitlementDefinition.getExternalReferenceCode(),
					skuExternalReferenceCode)) {

				generatedEntitlementDefinition = entitlementDefinition;
			}
			else {
				manualEntitlementDefinition = true;
			}
		}

		boolean published = Boolean.TRUE.equals(sku.getPublished());
		boolean trial = _isTrial(sku);

		if (generatedEntitlementDefinition == null) {
			if (!published) {
				return;
			}

			if (manualEntitlementDefinition) {
				if (_log.isDebugEnabled()) {
					_log.debug(
						StringBundler.concat(
							"Skipping SKU ", skuExternalReferenceCode,
							" because a manually created entitlement ",
							"definition already exists"));
				}

				return;
			}

			_addEntitlementDefinition(name, skuExternalReferenceCode, trial);
			_addEntitlementDefinitionSku(
				skuExternalReferenceCode, skuExternalReferenceCode);

			return;
		}

		_addEntitlementDefinitionSku(
			generatedEntitlementDefinition.getExternalReferenceCode(),
			skuExternalReferenceCode);

		if (published && !generatedEntitlementDefinition.isActive()) {
			_patchEntitlementDefinition(
				new JSONObject(
				).put(
					"active", true
				).put(
					"displayName", name
				).put(
					"name", name
				),
				skuExternalReferenceCode);

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Reactivated the entitlement definition \"", name,
						"\" for SKU ", skuExternalReferenceCode));
			}
		}
		else if (!published && generatedEntitlementDefinition.isActive()) {
			_patchEntitlementDefinition(
				new JSONObject(
				).put(
					"active", false
				),
				skuExternalReferenceCode);

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Deactivated the entitlement definition \"",
						generatedEntitlementDefinition.getName(), "\" for SKU ",
						skuExternalReferenceCode));
			}
		}
		else if (trial &&
				 (generatedEntitlementDefinition.getLicenseKeyDurationDays() ==
					 0)) {

			_patchEntitlementDefinition(
				new JSONObject(
				).put(
					"licenseKeyDurationDays", _TRIAL_LICENSE_KEY_DURATION_DAYS
				),
				skuExternalReferenceCode);

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Set the license key duration of the entitlement ",
						"definition \"",
						generatedEntitlementDefinition.getName(), "\" for SKU ",
						skuExternalReferenceCode, " to ",
						_TRIAL_LICENSE_KEY_DURATION_DAYS, " days"));
			}
		}
	}

	private static final int _TRIAL_LICENSE_KEY_DURATION_DAYS = 30;

	private static final Log _log = LogFactory.getLog(
		EntitlementDefinitionService.class);

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private CommerceSkuService _commerceSkuService;

	private final AtomicBoolean _reconciling = new AtomicBoolean();

}