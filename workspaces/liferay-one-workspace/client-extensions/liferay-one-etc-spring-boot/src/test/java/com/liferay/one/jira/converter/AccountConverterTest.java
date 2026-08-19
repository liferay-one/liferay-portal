/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountContactInformation;
import com.liferay.headless.admin.user.client.dto.v1_0.EmailAddress;
import com.liferay.headless.admin.user.client.dto.v1_0.Phone;
import com.liferay.headless.admin.user.client.dto.v1_0.WebUrl;
import com.liferay.one.jira.constants.AccountConstants;
import com.liferay.one.jira.model.JiraAssetObject;

import java.util.Date;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class AccountConverterTest {

	@BeforeEach
	public void setUp() {
		_accountConverter = JiraAssetObjectConverterTestUtil.prepare(
			new AccountConverter());
	}

	@Test
	public void testToAssetObjectFallsBackToFirstContactInformation() {
		AccountContactInformation accountContactInformation =
			new AccountContactInformation();

		accountContactInformation.setEmailAddresses(
			new EmailAddress[] {
				_emailAddress("first@liferay.com", false),
				_emailAddress("second@liferay.com", false)
			});
		accountContactInformation.setTelephones(
			new Phone[] {
				_phone("111", "local", false), _phone("222", "local", false)
			});
		accountContactInformation.setWebUrls(
			new WebUrl[] {
				_webUrl("https://first.example.com", false),
				_webUrl("https://second.example.com", false)
			});

		Account account = new Account();

		account.setAccountContactInformation(accountContactInformation);

		JiraAssetObject jiraAssetObject = _accountConverter.toAssetObject(
			account);

		Assertions.assertEquals(
			"first@liferay.com",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_CONTACT_EMAIL_ADDRESS));
		Assertions.assertEquals(
			"111",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_PHONE_NUMBER));
		Assertions.assertEquals(
			"https://first.example.com",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_WEBSITE));
	}

	@Test
	public void testToAssetObjectMapsAttributes() {
		Account account = new Account();

		account.setCustomFields(
			new CustomField[] {
				_customField("accountCode", "test-account-code"),
				_customField("accountTier", "Gold")
			});
		account.setDateCreated(new Date(0));
		account.setDateModified(new Date(86400000));
		account.setDescription("Test description");
		account.setExternalReferenceCode("test-erc");
		account.setName("Test Account");
		account.setStatus(0);

		JiraAssetObject jiraAssetObject = _accountConverter.toAssetObject(
			account);

		Assertions.assertEquals(
			"test-account-code",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_CODE));
		Assertions.assertEquals(
			"Test description",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_DESCRIPTION));
		Assertions.assertEquals(
			"1970-01-01T00:00:00Z",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_EXTERNAL_CREATED_AT));
		Assertions.assertEquals(
			"test-erc",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_EXTERNAL_KEY));
		Assertions.assertEquals(
			"1970-01-02T00:00:00Z",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_EXTERNAL_UPDATED_AT));
		Assertions.assertEquals(
			"Test Account",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_NAME));
		Assertions.assertEquals(
			"Active",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_STATUS));
		Assertions.assertEquals(
			"Gold",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_TIER));
	}

	@Test
	public void testToAssetObjectMapsClosedStatusForNonzeroStatus() {
		Account account = new Account();

		account.setStatus(5);

		JiraAssetObject jiraAssetObject = _accountConverter.toAssetObject(
			account);

		Assertions.assertEquals(
			"Closed",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_STATUS));
	}

	@Test
	public void testToAssetObjectPrefersExplicitExternalKeyAndName() {
		Account account = new Account();

		account.setExternalReferenceCode("test-erc");
		account.setName("Test Account");

		JiraAssetObject jiraAssetObject = _accountConverter.toAssetObject(
			account, "explicit-erc", "Explicit Name");

		Assertions.assertEquals(
			"explicit-erc",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_EXTERNAL_KEY));
		Assertions.assertEquals(
			"Explicit Name",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_NAME));
	}

	@Test
	public void testToAssetObjectPrefersPrimaryContactInformation() {
		AccountContactInformation accountContactInformation =
			new AccountContactInformation();

		accountContactInformation.setEmailAddresses(
			new EmailAddress[] {
				_emailAddress("first@liferay.com", false),
				_emailAddress("primary@liferay.com", true)
			});
		accountContactInformation.setTelephones(
			new Phone[] {
				_phone("111", "local", false), _phone("222", "fax", true),
				_phone("333", "local", true)
			});
		accountContactInformation.setWebUrls(
			new WebUrl[] {
				_webUrl("https://first.example.com", false),
				_webUrl("https://primary.example.com", true)
			});

		Account account = new Account();

		account.setAccountContactInformation(accountContactInformation);

		JiraAssetObject jiraAssetObject = _accountConverter.toAssetObject(
			account);

		Assertions.assertEquals(
			"primary@liferay.com",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_CONTACT_EMAIL_ADDRESS));
		Assertions.assertEquals(
			"222",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_FAX_NUMBER));
		Assertions.assertEquals(
			"333",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_PHONE_NUMBER));
		Assertions.assertEquals(
			"https://primary.example.com",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_WEBSITE));
	}

	@Test
	public void testToAssetObjectSkipsMissingValues() {
		Account account = new Account();

		account.setCustomFields(
			new CustomField[] {_customField("accountCode", null)});

		JiraAssetObject jiraAssetObject = _accountConverter.toAssetObject(
			account);

		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_CODE));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_CONTACT_EMAIL_ADDRESS));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_EXTERNAL_CREATED_AT));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_STATUS));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				AccountConstants.ATTRIBUTE_NAME_TIER));
	}

	private CustomField _customField(String name, Object data) {
		CustomField customField = new CustomField();

		customField.setName(name);

		if (data != null) {
			CustomValue customValue = new CustomValue();

			customValue.setData(data);

			customField.setCustomValue(customValue);
		}

		return customField;
	}

	private EmailAddress _emailAddress(String emailAddress, boolean primary) {
		EmailAddress emailAddressDTO = new EmailAddress();

		emailAddressDTO.setEmailAddress(emailAddress);
		emailAddressDTO.setPrimary(primary);

		return emailAddressDTO;
	}

	private Phone _phone(
		String phoneNumber, String phoneType, boolean primary) {

		Phone phone = new Phone();

		phone.setPhoneNumber(phoneNumber);
		phone.setPhoneType(phoneType);
		phone.setPrimary(primary);

		return phone;
	}

	private WebUrl _webUrl(String url, boolean primary) {
		WebUrl webUrl = new WebUrl();

		webUrl.setPrimary(primary);
		webUrl.setUrl(url);

		return webUrl;
	}

	private AccountConverter _accountConverter;

}