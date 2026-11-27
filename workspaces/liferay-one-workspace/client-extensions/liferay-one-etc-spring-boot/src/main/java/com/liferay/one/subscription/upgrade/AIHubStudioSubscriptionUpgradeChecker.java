/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.subscription.upgrade;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.one.constants.SkuOptionConstants;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.SubscriptionUpgrade;
import com.liferay.one.service.CommerceSkuService;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Veloso
 */
@Component
public class AIHubStudioSubscriptionUpgradeChecker
	implements SubscriptionUpgradeChecker {

	public static final String KEY = "ai-hub-studio";

	@Override
	public SubscriptionUpgrade check(List<Entitlement> unexpiredEntitlements)
		throws Exception {

		List<Entitlement> baseEntitlements = new ArrayList<>();

		for (Entitlement entitlement : unexpiredEntitlements) {
			if (Validator.isNull(entitlement.getSkuExternalReferenceCode()) ||
				!entitlement.isActiveOrScheduled()) {

				continue;
			}

			String aiHubTier = _commerceSkuService.fetchAIHubTier(
				entitlement.getSkuExternalReferenceCode());

			if (Objects.equals(
					aiHubTier, SkuOptionConstants.AI_HUB_TIER_STUDIO)) {

				return null;
			}

			if (!Objects.equals(
					aiHubTier, SkuOptionConstants.AI_HUB_TIER_ACTIVATE) ||
				!entitlement.isActive()) {

				continue;
			}

			baseEntitlements.add(entitlement);
		}

		return _subscriptionUpgradeCheckerHelper.fetchSubscriptionUpgrade(
			baseEntitlements, KEY, "AI Hub Studio",
			this::_fetchStudioSkuExternalReferenceCode, "ai-hub");
	}

	@Override
	public String getKey() {
		return KEY;
	}

	private String _fetchStudioSkuExternalReferenceCode(
			Entitlement baseEntitlement)
		throws Exception {

		Long productId = _commerceSkuService.fetchProductId(
			baseEntitlement.getSkuExternalReferenceCode());

		if (productId != null) {
			for (Sku sku : _commerceSkuService.getSkus(productId)) {
				if (Objects.equals(
						_commerceSkuService.fetchAIHubTier(
							sku.getExternalReferenceCode()),
						SkuOptionConstants.AI_HUB_TIER_STUDIO)) {

					return sku.getExternalReferenceCode();
				}
			}
		}

		if (_log.isWarnEnabled()) {
			_log.warn(
				"Unable to find the AI Hub Studio SKU for product " +
					productId);
		}

		return null;
	}

	private static final Log _log = LogFactory.getLog(
		AIHubStudioSubscriptionUpgradeChecker.class);

	@Autowired
	private CommerceSkuService _commerceSkuService;

	@Autowired
	private SubscriptionUpgradeCheckerHelper _subscriptionUpgradeCheckerHelper;

}