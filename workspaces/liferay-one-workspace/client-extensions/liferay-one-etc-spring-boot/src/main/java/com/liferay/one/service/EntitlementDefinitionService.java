/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.constants.TaxonomyCategoryConstants;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.util.CommerceProductUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
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

		List<String> categoryExternalReferenceCodes =
			CommerceProductUtil.getCategoryExternalReferenceCodes(product);

		if (!categoryExternalReferenceCodes.contains(
				TaxonomyCategoryConstants.EXTERNAL_REFERENCE_CODE_APP) ||
			!ArrayUtil.contains(
				ProductSpecificationConstants.TYPES_LICENSE_KEY_GENERATING,
				CommerceProductUtil.getSpecificationValue(
					product, ProductSpecificationConstants.KEY_TYPE))) {

			return;
		}

		String productName = CommerceProductUtil.getName(product);

		if (Validator.isNull(productName)) {
			if (_log.isWarnEnabled()) {
				_log.warn("Unable to find the name of product " + cProductId);
			}

			return;
		}

		List<Sku> skus = new ArrayList<>();

		for (Sku sku : _commerceSkuService.getSkus(cProductId)) {
			if (Validator.isNull(sku.getExternalReferenceCode())) {
				if (_log.isWarnEnabled()) {
					_log.warn(
						"Skipping a SKU of product " + cProductId +
							" without an external reference code");
				}

				continue;
			}

			skus.add(sku);
		}

		if (skus.isEmpty()) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Unable to generate entitlement definitions for ",
						"product ", cProductId, " without SKUs"));
			}

			return;
		}

		Map<String, List<EntitlementDefinition>>
			entitlementDefinitionsBySkuExternalReferenceCode =
				_getEntitlementDefinitionsBySkuExternalReferenceCode(skus);

		for (Sku sku : skus) {
			try {
				_syncEntitlementDefinition(
					entitlementDefinitionsBySkuExternalReferenceCode.
						getOrDefault(sku.getExternalReferenceCode(), List.of()),
					productName, sku);
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
			String filterString)
		throws Exception {

		return getAllItems(
			"/o/c/entitlementdefinitions", filterString,
			EntitlementDefinition::new);
	}

	public List<EntitlementDefinition> getEntitlementDefinitions(
			String filterString, Map<String, String> productOptions)
		throws Exception {

		List<EntitlementDefinition> entitlementDefinitions =
			getEntitlementDefinitions(filterString);

		Iterator<EntitlementDefinition> iterator =
			entitlementDefinitions.iterator();

		while (iterator.hasNext()) {
			EntitlementDefinition entitlementDefinition = iterator.next();

			if (!_matches(
					entitlementDefinition.getProductOptions(),
					productOptions)) {

				iterator.remove();
			}
		}

		return entitlementDefinitions;
	}

	private void _addEntitlementDefinition(
			String name, String skuExternalReferenceCode)
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

	private Map<String, List<EntitlementDefinition>>
			_getEntitlementDefinitionsBySkuExternalReferenceCode(List<Sku> skus)
		throws Exception {

		StringBundler sb = new StringBundler((3 * skus.size()) + 1);

		sb.append("skuExternalReferenceCode in (");

		for (int i = 0; i < skus.size(); i++) {
			Sku sku = skus.get(i);

			if (i > 0) {
				sb.append(",");
			}

			sb.append("'");
			sb.append(escapeODataString(sku.getExternalReferenceCode()));
			sb.append("'");
		}

		sb.append(")");

		Map<String, List<EntitlementDefinition>>
			entitlementDefinitionsBySkuExternalReferenceCode = new HashMap<>();

		for (EntitlementDefinition entitlementDefinition :
				getEntitlementDefinitions(sb.toString())) {

			List<EntitlementDefinition> entitlementDefinitions =
				entitlementDefinitionsBySkuExternalReferenceCode.
					computeIfAbsent(
						entitlementDefinition.getSkuExternalReferenceCode(),
						key -> new ArrayList<>());

			entitlementDefinitions.add(entitlementDefinition);
		}

		return entitlementDefinitionsBySkuExternalReferenceCode;
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

	private void _syncEntitlementDefinition(
			List<EntitlementDefinition> entitlementDefinitions,
			String productName, Sku sku)
		throws Exception {

		String skuExternalReferenceCode = sku.getExternalReferenceCode();

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

			_addEntitlementDefinition(name, skuExternalReferenceCode);
		}
		else if (published && !generatedEntitlementDefinition.isActive()) {
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
	}

	private static final Log _log = LogFactory.getLog(
		EntitlementDefinitionService.class);

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private CommerceSkuService _commerceSkuService;

}