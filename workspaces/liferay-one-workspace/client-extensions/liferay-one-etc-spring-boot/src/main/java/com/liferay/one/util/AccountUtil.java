/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.portal.kernel.util.GetterUtil;

/**
 * @author Allen Ziegenfus
 */
public class AccountUtil {

	public static boolean getCustomFieldBoolean(
		Account account, String name, boolean defaultValue) {

		CustomField[] customFields = account.getCustomFields();

		if (customFields == null) {
			return defaultValue;
		}

		for (CustomField customField : customFields) {
			if (!name.equals(customField.getName())) {
				continue;
			}

			CustomValue customValue = customField.getCustomValue();

			if (customValue == null) {
				return defaultValue;
			}

			return GetterUtil.getBoolean(customValue.getData(), defaultValue);
		}

		return defaultValue;
	}

}