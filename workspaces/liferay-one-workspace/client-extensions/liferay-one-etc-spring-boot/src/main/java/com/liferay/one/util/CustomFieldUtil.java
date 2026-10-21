/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.Validator;

/**
 * @author Ryan Schuhler
 */
public class CustomFieldUtil {

	public static String getString(CustomField[] customFields, String name) {
		if (customFields == null) {
			return null;
		}

		for (CustomField customField : customFields) {
			if (!name.equals(customField.getName())) {
				continue;
			}

			CustomValue customValue = customField.getCustomValue();

			if (customValue == null) {
				return null;
			}

			String value = GetterUtil.getString(customValue.getData());

			if (Validator.isNull(value)) {
				return null;
			}

			return value;
		}

		return null;
	}

}