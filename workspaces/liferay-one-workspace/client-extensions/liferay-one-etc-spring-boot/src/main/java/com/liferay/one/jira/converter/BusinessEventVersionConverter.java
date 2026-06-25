/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.BusinessEventConstants;
import com.liferay.one.jira.model.BusinessEventVersion;

import java.util.Map;

import org.json.JSONObject;

import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class BusinessEventVersionConverter extends AssetObjectConverter {

	public BusinessEventVersion toBusinessEventVersion(
		JSONObject jiraAssetObjectJSONObject) {

		Map<String, String> attributeIds = getAttributeIds();

		return new BusinessEventVersion(
			getAttributeValue(
				attributeIds.get(BusinessEventConstants.ATTRIBUTE_NAME_AUTHOR),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(BusinessEventConstants.ATTRIBUTE_NAME_CHANGE),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(BusinessEventConstants.ATTRIBUTE_NAME_COMMENT),
				jiraAssetObjectJSONObject),
			getAttributeKey(
				attributeIds.get(BusinessEventConstants.ATTRIBUTE_NAME_CREATED),
				jiraAssetObjectJSONObject));
	}

	@Override
	protected String getObjectSchemaName() {
		return BusinessEventConstants.OBJECT_SCHEMA_BUSINESS_EVENTS;
	}

	@Override
	protected String getObjectTypeName() {
		return BusinessEventConstants.OBJECT_TYPE_BUSINESS_EVENT_VERSION;
	}

}