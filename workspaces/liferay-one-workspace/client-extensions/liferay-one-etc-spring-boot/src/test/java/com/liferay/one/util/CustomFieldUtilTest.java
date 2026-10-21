/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-CUSTOMFIELDUTIL] CustomFieldUtil")
public class CustomFieldUtilTest {

	@Test
	public void testGetStringIsNullForABlankValue() {
		Assertions.assertNull(
			CustomFieldUtil.getString(
				new CustomField[] {_createCustomField("oktaGroupId", "")},
				"oktaGroupId"));
	}

	@Test
	public void testGetStringIsNullForAMissingField() {
		Assertions.assertNull(
			CustomFieldUtil.getString(
				new CustomField[] {_createCustomField("other", "00g-a")},
				"oktaGroupId"));
	}

	@Test
	public void testGetStringIsNullForAMissingValue() {
		CustomField customField = new CustomField();

		customField.setName("oktaGroupId");

		Assertions.assertNull(
			CustomFieldUtil.getString(
				new CustomField[] {customField}, "oktaGroupId"));
	}

	@Test
	public void testGetStringIsNullForNullCustomFields() {
		Assertions.assertNull(CustomFieldUtil.getString(null, "oktaGroupId"));
	}

	@Test
	public void testGetStringReadsTheValue() {
		Assertions.assertEquals(
			"00g-a",
			CustomFieldUtil.getString(
				new CustomField[] {
					_createCustomField("other", "x"),
					_createCustomField("oktaGroupId", "00g-a")
				},
				"oktaGroupId"));
	}

	private CustomField _createCustomField(String name, Object data) {
		CustomField customField = new CustomField();

		CustomValue customValue = new CustomValue();

		customValue.setData(data);

		customField.setCustomValue(customValue);

		customField.setName(name);

		return customField;
	}

}