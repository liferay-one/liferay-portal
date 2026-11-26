/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.subscription.upgrade;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.SubscriptionUpgrade;
import com.liferay.one.service.CommerceOrderItemService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.CommerceProductService;
import com.liferay.one.service.CommerceSkuService;
import com.liferay.one.service.ContractService;
import com.liferay.petra.function.UnsafeFunction;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;

import java.util.List;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Veloso
 */
@Component
public class SubscriptionUpgradeCheckerHelper {

	public Instant fetchContractEndDateInstant(Entitlement entitlement)
		throws Exception {

		Contract contract = null;

		if (entitlement.getContractId() > 0) {
			contract = _contractService.fetchContract(
				entitlement.getContractId());
		}

		if ((contract == null) || (contract.getEndDateInstant() == null)) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Unable to get the contract end date of entitlement ",
						entitlement.getEntitlementId(), " for project ",
						entitlement.getProjectExternalReferenceCode()));
			}

			return null;
		}

		Instant endDateInstant = contract.getEndDateInstant();

		if (!endDateInstant.isAfter(Instant.now())) {
			return null;
		}

		return endDateInstant;
	}

	public Product fetchProduct(String skuExternalReferenceCode)
		throws Exception {

		if (Validator.isNull(skuExternalReferenceCode)) {
			return null;
		}

		Long productId = _commerceSkuService.fetchProductId(
			skuExternalReferenceCode);

		if (productId == null) {
			return null;
		}

		return _commerceProductService.fetchProduct(productId);
	}

	public SubscriptionUpgrade fetchSubscriptionUpgrade(
			List<Entitlement> baseEntitlements, String key,
			String targetProduct,
			UnsafeFunction<Entitlement, String, Exception>
				targetSkuExternalReferenceCodeUnsafeFunction,
			String type)
		throws Exception {

		SubscriptionUpgrade subscriptionUpgrade = null;

		for (Entitlement baseEntitlement : baseEntitlements) {
			if (!hasComposablePricebook(baseEntitlement)) {
				continue;
			}

			Instant contractEndDateInstant = fetchContractEndDateInstant(
				baseEntitlement);

			if ((contractEndDateInstant == null) ||
				((subscriptionUpgrade != null) &&
				 !contractEndDateInstant.isAfter(
					 subscriptionUpgrade.getContractEndDateInstant()))) {

				continue;
			}

			String targetSkuExternalReferenceCode =
				targetSkuExternalReferenceCodeUnsafeFunction.apply(
					baseEntitlement);

			if (targetSkuExternalReferenceCode == null) {
				continue;
			}

			subscriptionUpgrade = new SubscriptionUpgrade(
				contractEndDateInstant,
				baseEntitlement.getSkuExternalReferenceCode(), key,
				targetProduct, targetSkuExternalReferenceCode, type);
		}

		return subscriptionUpgrade;
	}

	public boolean hasComposablePricebook(Entitlement entitlement)
		throws Exception {

		String salesforcePricebookId = _fetchSalesforcePricebookId(entitlement);

		if (Validator.isNotNull(salesforcePricebookId)) {
			return ArrayUtil.contains(
				StringUtil.split(_composablePricebookIds),
				salesforcePricebookId);
		}

		if ((entitlement.getContractId() > 0) && _log.isWarnEnabled()) {
			_log.warn(
				StringBundler.concat(
					"Entitlement ", entitlement.getEntitlementId(),
					" for project ",
					entitlement.getProjectExternalReferenceCode(),
					" has a contract but no Salesforce price book"));
		}

		return false;
	}

	private String _fetchSalesforcePricebookId(Entitlement entitlement)
		throws Exception {

		if (entitlement.getCommerceOrderItemId() <= 0) {
			return null;
		}

		OrderItem orderItem = _commerceOrderItemService.fetchCommerceOrderItem(
			entitlement.getCommerceOrderItemId());

		if (orderItem == null) {
			return null;
		}

		Order order = _commerceOrderService.fetchCommerceOrder(
			orderItem.getOrderId());

		if ((order == null) || (order.getCustomFields() == null)) {
			return null;
		}

		Map<String, String> customFields =
			(Map<String, String>)order.getCustomFields();

		return customFields.get("salesforcePricebookId");
	}

	private static final Log _log = LogFactory.getLog(
		SubscriptionUpgradeCheckerHelper.class);

	@Autowired
	private CommerceOrderItemService _commerceOrderItemService;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private CommerceSkuService _commerceSkuService;

	@Value("${liferay.one.salesforce.composable.pricebook.ids}")
	private String _composablePricebookIds;

	@Autowired
	private ContractService _contractService;

}