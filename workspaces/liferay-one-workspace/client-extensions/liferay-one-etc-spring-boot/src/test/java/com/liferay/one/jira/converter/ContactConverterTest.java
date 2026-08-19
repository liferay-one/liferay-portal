/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.jira.constants.ContactConstants;
import com.liferay.one.jira.model.JiraAssetObject;

import java.util.Date;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class ContactConverterTest {

	@BeforeEach
	public void setUp() {
		_contactConverter = JiraAssetObjectConverterTestUtil.prepare(
			new ContactConverter());
	}

	@Test
	public void testToAssetObjectMapsAttributes() {
		UserAccount userAccount = new UserAccount();

		userAccount.setAdditionalName("Middle");
		userAccount.setCustomFields(
			new CustomField[] {_verifiedCustomField(true)});
		userAccount.setDateCreated(new Date(0));
		userAccount.setDateModified(new Date(86400000));
		userAccount.setEmailAddress("test@liferay.com");
		userAccount.setExternalReferenceCode("test-erc");
		userAccount.setFamilyName("Last");
		userAccount.setGivenName("First");
		userAccount.setLanguageId("en_US");
		userAccount.setName("First Middle Last");

		JiraAssetObject jiraAssetObject = _contactConverter.toAssetObject(
			userAccount);

		Assertions.assertEquals(
			"test@liferay.com",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_EMAIL_ADDRESS));
		Assertions.assertEquals(
			"true",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_EMAIL_ADDRESS_VERIFIED));
		Assertions.assertEquals(
			"1970-01-01T00:00:00Z",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_EXTERNAL_CREATED_AT));
		Assertions.assertEquals(
			"test-erc",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_EXTERNAL_KEY));
		Assertions.assertEquals(
			"1970-01-02T00:00:00Z",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_EXTERNAL_UPDATED_AT));
		Assertions.assertEquals(
			"First",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_FIRST_NAME));
		Assertions.assertEquals(
			"en_US",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_LANGUAGE_ID));
		Assertions.assertEquals(
			"Last",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_LAST_NAME));
		Assertions.assertEquals(
			"Middle",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_MIDDLE_NAME));
		Assertions.assertEquals(
			"First Middle Last",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_NAME));
	}

	@Test
	public void testToAssetObjectMapsUnverifiedEmailAddress() {
		UserAccount userAccount = new UserAccount();

		userAccount.setCustomFields(
			new CustomField[] {_verifiedCustomField(false)});

		JiraAssetObject jiraAssetObject = _contactConverter.toAssetObject(
			userAccount);

		Assertions.assertEquals(
			"false",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_EMAIL_ADDRESS_VERIFIED));
	}

	@Test
	public void testToAssetObjectSkipsMissingValues() {
		JiraAssetObject jiraAssetObject = _contactConverter.toAssetObject(
			new UserAccount());

		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_EMAIL_ADDRESS));
		Assertions.assertEquals(
			"false",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_EMAIL_ADDRESS_VERIFIED));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_EXTERNAL_CREATED_AT));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_EXTERNAL_KEY));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				ContactConstants.ATTRIBUTE_NAME_NAME));
	}

	private CustomField _verifiedCustomField(boolean verified) {
		CustomField customField = new CustomField();

		customField.setName("verified");

		CustomValue customValue = new CustomValue();

		customValue.setData(verified);

		customField.setCustomValue(customValue);

		return customField;
	}

	private ContactConverter _contactConverter;

}