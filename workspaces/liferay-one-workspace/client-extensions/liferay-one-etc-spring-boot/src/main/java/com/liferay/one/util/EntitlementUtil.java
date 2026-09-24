/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.portal.kernel.util.Validator;

import java.util.List;
import java.util.Objects;

/**
 * @author Drew Brokke
 */
public class EntitlementUtil {

	/**
	 * Returns the usage definition external reference code of the first
	 * entitlement with the given name that has one.
	 */
	public static String getUsageDefinitionExternalReferenceCode(
		String entitlementName, List<Entitlement> entitlements) {

		for (Entitlement entitlement : entitlements) {
			EntitlementDefinition entitlementDefinition =
				entitlement.getEntitlementDefinition();

			if (!Objects.equals(entitlement.getName(), entitlementName) ||
				(entitlementDefinition == null)) {

				continue;
			}

			String usageDefinitionExternalReferenceCode =
				entitlementDefinition.getUsageDefinitionExternalReferenceCode();

			if (Validator.isNotNull(usageDefinitionExternalReferenceCode)) {
				return usageDefinitionExternalReferenceCode;
			}
		}

		return null;
	}

}