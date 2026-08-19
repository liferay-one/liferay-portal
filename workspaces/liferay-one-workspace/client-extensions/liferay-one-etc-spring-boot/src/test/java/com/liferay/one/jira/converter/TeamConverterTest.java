/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.one.jira.constants.TeamConstants;
import com.liferay.one.jira.model.JiraAssetObject;

import java.util.Date;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class TeamConverterTest {

	@BeforeEach
	public void setUp() {
		_teamConverter = JiraAssetObjectConverterTestUtil.prepare(
			new TeamConverter());
	}

	@Test
	public void testToAssetObjectMapsAttributes() {
		Organization organization = new Organization();

		organization.setDateCreated(new Date(0));
		organization.setDateModified(new Date(86400000));
		organization.setExternalReferenceCode("test-erc");
		organization.setName("Test Team");

		JiraAssetObject jiraAssetObject = _teamConverter.toAssetObject(
			organization);

		Assertions.assertEquals(
			"1970-01-01T00:00:00Z",
			jiraAssetObject.getAttributeValue(
				TeamConstants.ATTRIBUTE_NAME_EXTERNAL_CREATED_AT));
		Assertions.assertEquals(
			"test-erc",
			jiraAssetObject.getAttributeValue(
				TeamConstants.ATTRIBUTE_NAME_EXTERNAL_KEY));
		Assertions.assertEquals(
			"1970-01-02T00:00:00Z",
			jiraAssetObject.getAttributeValue(
				TeamConstants.ATTRIBUTE_NAME_EXTERNAL_UPDATED_AT));
		Assertions.assertEquals(
			"Test Team",
			jiraAssetObject.getAttributeValue(
				TeamConstants.ATTRIBUTE_NAME_NAME));
	}

	@Test
	public void testToAssetObjectSkipsMissingValues() {
		JiraAssetObject jiraAssetObject = _teamConverter.toAssetObject(
			new Organization());

		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				TeamConstants.ATTRIBUTE_NAME_EXTERNAL_CREATED_AT));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				TeamConstants.ATTRIBUTE_NAME_EXTERNAL_KEY));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				TeamConstants.ATTRIBUTE_NAME_EXTERNAL_UPDATED_AT));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				TeamConstants.ATTRIBUTE_NAME_NAME));
	}

	private TeamConverter _teamConverter;

}