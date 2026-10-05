/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.headless.admin.user.client.dto.v1_0.PostalAddress;
import com.liferay.one.jira.constants.PostalAddressConstants;
import com.liferay.one.jira.model.JiraAssetObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CONV-POSTALADDRESSCONVERTER] PostalAddressConverter")
public class PostalAddressConverterTest {

	@BeforeEach
	public void setUp() {
		_postalAddressConverter = JiraAssetObjectConverterTestUtil.prepare(
			new PostalAddressConverter());
	}

	@Test
	public void testGetExternalKeyAttributeName() {
		Assertions.assertEquals(
			PostalAddressConstants.ATTRIBUTE_NAME_ID,
			_postalAddressConverter.getExternalKeyAttributeName());
	}

	@Test
	public void testToAssetObjectMapsAttributes() {
		PostalAddress postalAddress = new PostalAddress();

		postalAddress.setAddressCountry("United States");
		postalAddress.setAddressLocality("Diamond Bar");
		postalAddress.setAddressRegion("California");
		postalAddress.setAddressType("billing");
		postalAddress.setId(12L);
		postalAddress.setPostalCode("91765");
		postalAddress.setPrimary(true);
		postalAddress.setStreetAddressLine1("1400 Montefino Ave");
		postalAddress.setStreetAddressLine2("Suite 100");
		postalAddress.setStreetAddressLine3("Floor 2");

		JiraAssetObject jiraAssetObject = _postalAddressConverter.toAssetObject(
			postalAddress);

		Assertions.assertEquals(
			"United States",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_ADDRESS_COUNTRY));
		Assertions.assertEquals(
			"Diamond Bar",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_ADDRESS_LOCALITY));
		Assertions.assertEquals(
			"California",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_ADDRESS_REGION));
		Assertions.assertEquals(
			"billing",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_ADDRESS_TYPE));
		Assertions.assertEquals(
			"12",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_ID));
		Assertions.assertEquals(
			"1400 Montefino Ave, Suite 100, Floor 2, Diamond Bar, " +
				"California, United States, 91765",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_NAME));
		Assertions.assertEquals(
			"91765",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_POSTAL_CODE));
		Assertions.assertEquals(
			"true",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_PRIMARY));
		Assertions.assertEquals(
			"1400 Montefino Ave",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_STREET_ADDRESS_LINE_1));
		Assertions.assertEquals(
			"Suite 100",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_STREET_ADDRESS_LINE_2));
		Assertions.assertEquals(
			"Floor 2",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_STREET_ADDRESS_LINE_3));
	}

	@Test
	public void testToAssetObjectSkipsMissingIDAndBlankNameParts() {
		PostalAddress postalAddress = new PostalAddress();

		postalAddress.setAddressCountry("Brazil");
		postalAddress.setAddressLocality("");
		postalAddress.setStreetAddressLine1("Rua A");

		JiraAssetObject jiraAssetObject = _postalAddressConverter.toAssetObject(
			postalAddress);

		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_ID));
		Assertions.assertEquals(
			"Rua A, Brazil",
			jiraAssetObject.getAttributeValue(
				PostalAddressConstants.ATTRIBUTE_NAME_NAME));
	}

	private PostalAddressConverter _postalAddressConverter;

}