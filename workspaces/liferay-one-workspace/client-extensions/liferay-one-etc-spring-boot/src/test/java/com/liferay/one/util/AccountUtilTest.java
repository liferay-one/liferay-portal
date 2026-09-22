/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.Account;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Allen Ziegenfus
 */
public class AccountUtilTest {

	@Test
	public void testGetCustomFieldBooleanReturnsDefaultValueWhenAbsent() {
		Account account = new Account();

		Assertions.assertTrue(
			AccountUtil.getCustomFieldBoolean(
				account, "allowSelfProvisioning", true));

		Assertions.assertFalse(
			AccountUtil.getCustomFieldBoolean(
				account, "allowComplimentary", false));

		account.setCustomFields(
			() -> new CustomField[] {
				_createCustomField("accountTier", "Gold")
			});

		Assertions.assertTrue(
			AccountUtil.getCustomFieldBoolean(
				account, "allowSelfProvisioning", true));
	}

	@Test
	public void testGetCustomFieldBooleanReturnsDefaultValueWhenValueIsNull() {
		Account account = new Account();

		CustomField customField = new CustomField();

		customField.setName(() -> "allowSelfProvisioning");

		account.setCustomFields(() -> new CustomField[] {customField});

		Assertions.assertTrue(
			AccountUtil.getCustomFieldBoolean(
				account, "allowSelfProvisioning", true));
	}

	@Test
	public void testGetCustomFieldBooleanReturnsStoredStringValue() {
		Account account = new Account();

		account.setCustomFields(
			() -> new CustomField[] {
				_createCustomField("allowPermanentLicenses", "false")
			});

		Assertions.assertFalse(
			AccountUtil.getCustomFieldBoolean(
				account, "allowPermanentLicenses", true));
	}

	@Test
	public void testGetCustomFieldBooleanReturnsStoredValue() {
		Account account = new Account();

		account.setCustomFields(
			() -> new CustomField[] {
				_createCustomField("allowComplimentary", true),
				_createCustomField("allowSelfProvisioning", false)
			});

		Assertions.assertTrue(
			AccountUtil.getCustomFieldBoolean(
				account, "allowComplimentary", false));

		Assertions.assertFalse(
			AccountUtil.getCustomFieldBoolean(
				account, "allowSelfProvisioning", true));
	}

	private CustomField _createCustomField(String name, Object data) {
		CustomField customField = new CustomField();

		customField.setName(() -> name);

		CustomValue customValue = new CustomValue();

		customValue.setData(() -> data);

		customField.setCustomValue(() -> customValue);

		return customField;
	}

}