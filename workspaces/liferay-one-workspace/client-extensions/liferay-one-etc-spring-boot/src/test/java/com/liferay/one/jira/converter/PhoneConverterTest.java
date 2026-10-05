/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.headless.admin.user.client.dto.v1_0.Phone;
import com.liferay.one.jira.constants.PhoneConstants;
import com.liferay.one.jira.model.JiraAssetObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CONV-PHONECONVERTER] PhoneConverter")
public class PhoneConverterTest {

	@BeforeEach
	public void setUp() {
		_phoneConverter = JiraAssetObjectConverterTestUtil.prepare(
			new PhoneConverter());
	}

	@Test
	public void testGetExternalKeyAttributeName() {
		Assertions.assertEquals(
			PhoneConstants.ATTRIBUTE_NAME_NUMBER,
			_phoneConverter.getExternalKeyAttributeName());
	}

	@Test
	public void testToAssetObjectMapsAttributes() {
		JiraAssetObject jiraAssetObject = _phoneConverter.toAssetObject(
			_createPhone("Mobile Phone"));

		Assertions.assertEquals(
			"555-0100",
			jiraAssetObject.getAttributeValue(
				PhoneConstants.ATTRIBUTE_NAME_NAME));
		Assertions.assertEquals(
			"555-0100",
			jiraAssetObject.getAttributeValue(
				PhoneConstants.ATTRIBUTE_NAME_NUMBER));
		Assertions.assertEquals(
			"true",
			jiraAssetObject.getAttributeValue(
				PhoneConstants.ATTRIBUTE_NAME_PRIMARY));
		Assertions.assertEquals(
			"Mobile",
			jiraAssetObject.getAttributeValue(
				PhoneConstants.ATTRIBUTE_NAME_TYPE));
	}

	@Test
	public void testToAssetObjectMapsNonmobileTypeToOther() {
		JiraAssetObject jiraAssetObject = _phoneConverter.toAssetObject(
			_createPhone("business"));

		Assertions.assertEquals(
			"Other",
			jiraAssetObject.getAttributeValue(
				PhoneConstants.ATTRIBUTE_NAME_TYPE));
	}

	@Test
	public void testToAssetObjectSkipsBlankType() {
		JiraAssetObject jiraAssetObject = _phoneConverter.toAssetObject(
			_createPhone(""));

		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				PhoneConstants.ATTRIBUTE_NAME_TYPE));

		jiraAssetObject = _phoneConverter.toAssetObject(_createPhone(null));

		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				PhoneConstants.ATTRIBUTE_NAME_TYPE));
	}

	private Phone _createPhone(String phoneType) {
		Phone phone = new Phone();

		phone.setPhoneNumber("555-0100");
		phone.setPhoneType(phoneType);
		phone.setPrimary(true);

		return phone;
	}

	private PhoneConverter _phoneConverter;

}