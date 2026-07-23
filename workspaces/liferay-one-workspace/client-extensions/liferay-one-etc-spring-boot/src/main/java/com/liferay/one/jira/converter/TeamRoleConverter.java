/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.TeamRoleConstants;
import com.liferay.one.jira.model.JiraAssetObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class TeamRoleConverter extends BaseJiraAssetObjectConverter {

	@Override
	public String getObjectTypeName() {
		return TeamRoleConstants.OBJECT_TYPE_NAME;
	}

	public JiraAssetObject toFirstLineSupportAssetObject() {
		JiraAssetObject jiraAssetObject = createJiraAssetObject();

		jiraAssetObject.setAttributeValue(
			TeamRoleConstants.ATTRIBUTE_NAME_EXTERNAL_KEY,
			TeamRoleConstants.EXTERNAL_KEY_FIRST_LINE_SUPPORT);
		jiraAssetObject.setAttributeValue(
			TeamRoleConstants.ATTRIBUTE_NAME_NAME,
			TeamRoleConstants.NAME_FIRST_LINE_SUPPORT);
		jiraAssetObject.setAttributeValue(
			TeamRoleConstants.ATTRIBUTE_NAME_TYPE, "Account");

		return jiraAssetObject;
	}

	@Override
	protected String getObjectSchemaName() {
		return _schemaName;
	}

	@Value("${liferay.one.jira.asset.schema.name}")
	private String _schemaName;

}