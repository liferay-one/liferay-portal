/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

import com.liferay.portal.kernel.util.SetUtil;
import com.liferay.portal.kernel.util.StringUtil;

import java.util.Collections;
import java.util.Set;

/**
 * @author Allen Ziegenfus
 */
public class CommonLicenseKeyConstants {

	public static final String PRODUCT_FAMILY_COMMERCE = "commerce";

	public static final String PRODUCT_FAMILY_ENTERPRISE_SEARCH =
		"enterpriseSearch";

	public static final String PRODUCT_GROUP_COMMERCE = "COMMERCE";

	public static final String PRODUCT_GROUP_ENTERPRISE_SEARCH =
		"ENTERPRISE_SEARCH";

	public static Set<String> getEntitlementDefinitionExternalReferenceCodes(
		String productFamily) {

		if (StringUtil.equals(productFamily, PRODUCT_FAMILY_COMMERCE)) {
			return _commerceEntitlementDefinitionExternalReferenceCodes;
		}

		if (StringUtil.equals(
				productFamily, PRODUCT_FAMILY_ENTERPRISE_SEARCH)) {

			return _enterpriseSearchEntitlementDefinitionExternalReferenceCodes;
		}

		return Collections.emptySet();
	}

	public static String toProductFamily(String productGroup) {
		if (StringUtil.equals(productGroup, PRODUCT_GROUP_ENTERPRISE_SEARCH)) {
			return PRODUCT_FAMILY_ENTERPRISE_SEARCH;
		}

		return PRODUCT_FAMILY_COMMERCE;
	}

	private static final Set<String>
		_commerceEntitlementDefinitionExternalReferenceCodes =
			SetUtil.fromArray("C_ENT_DEF_COMMERCE", "C_ENT_DEF_COMMERCE_CLOUD");
	private static final Set<String>
		_enterpriseSearchEntitlementDefinitionExternalReferenceCodes =
			SetUtil.fromArray(
				"C_ENT_DEF_ENTERPRISE_SEARCH",
				"C_ENT_DEF_ENTERPRISE_SEARCH_CLOUD");

}