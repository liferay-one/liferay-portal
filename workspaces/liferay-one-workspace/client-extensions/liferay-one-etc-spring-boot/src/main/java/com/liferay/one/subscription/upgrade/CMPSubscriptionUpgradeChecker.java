/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.subscription.upgrade;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.one.constants.CommerceProductConstants;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.SubscriptionUpgrade;
import com.liferay.one.util.CommerceProductUtil;
import com.liferay.portal.kernel.util.StringUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Veloso
 */
@Component
public class CMPSubscriptionUpgradeChecker
	implements SubscriptionUpgradeChecker {

	public static final String KEY = "liferay-platform-cmp";

	@Override
	public SubscriptionUpgrade check(List<Entitlement> unexpiredEntitlements)
		throws Exception {

		List<Entitlement> baseEntitlements = new ArrayList<>();

		for (Entitlement entitlement : unexpiredEntitlements) {
			if (!entitlement.isActiveOrScheduled()) {
				continue;
			}

			Product product = _subscriptionUpgradeCheckerHelper.fetchProduct(
				entitlement.getSkuExternalReferenceCode());

			if (product == null) {
				continue;
			}

			if (_isCMP(product) && (entitlement.getContractId() > 0)) {
				return null;
			}

			if (!Objects.equals(
					product.getExternalReferenceCode(),
					CommerceProductConstants.
						EXTERNAL_REFERENCE_CODE_LIFERAY_PLATFORM) ||
				!entitlement.isActive()) {

				continue;
			}

			baseEntitlements.add(entitlement);
		}

		return _subscriptionUpgradeCheckerHelper.fetchSubscriptionUpgrade(
			baseEntitlements, KEY, "CMP",
			baseEntitlement -> _cmpSkuExternalReferenceCode, "cmp");
	}

	@Override
	public String getKey() {
		return KEY;
	}

	private boolean _isCMP(Product product) {
		return StringUtil.equalsIgnoreCase(
			CommerceProductUtil.getSpecificationValue(
				product, ProductSpecificationConstants.KEY_SOLUTION_TYPE),
			ProductSpecificationConstants.SOLUTION_TYPE_CMP);
	}

	@Value(
		"${liferay.one.subscription.upgrade.cmp.sku.external.reference.code}"
	)
	private String _cmpSkuExternalReferenceCode;

	@Autowired
	private SubscriptionUpgradeCheckerHelper _subscriptionUpgradeCheckerHelper;

}