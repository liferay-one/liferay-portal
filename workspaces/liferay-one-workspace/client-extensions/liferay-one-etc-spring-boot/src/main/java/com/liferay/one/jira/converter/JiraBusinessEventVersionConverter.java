/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.JiraBusinessEventConstants;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.model.JiraBusinessEventVersion;

import org.json.JSONObject;

import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class JiraBusinessEventVersionConverter
	extends BaseJiraAssetObjectConverter {

	@Override
	public String getObjectTypeName() {
		return JiraBusinessEventConstants.OBJECT_TYPE_BUSINESS_EVENT_VERSION;
	}

	public JiraBusinessEventVersion toJiraBusinessEventVersion(
		JSONObject jiraAssetObjectJSONObject) {

		JiraAssetObject jiraAssetObject = toJiraAssetObject(
			jiraAssetObjectJSONObject);

		return new JiraBusinessEventVersion(
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_AUTHOR),
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_CHANGE),
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_COMMENT),
			jiraAssetObject.getAttributeValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_CREATED));
	}

	@Override
	protected String getObjectSchemaName() {
		return JiraBusinessEventConstants.OBJECT_SCHEMA_BUSINESS_EVENTS;
	}

}