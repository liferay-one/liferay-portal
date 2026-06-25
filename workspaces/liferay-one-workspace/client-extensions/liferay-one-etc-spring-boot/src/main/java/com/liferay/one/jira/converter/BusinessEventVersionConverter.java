/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.model.BusinessEventVersion;

import org.json.JSONObject;

import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class BusinessEventVersionConverter extends AssetObjectConverter {

	@Override
	public String getObjectSchemaName() {
		return Constants.OBJECT_SCHEMA_NAME;
	}

	@Override
	public String getObjectTypeName() {
		return Constants.OBJECT_TYPE_NAME;
	}

	public BusinessEventVersion toBusinessEventVersion(
		JSONObject jiraAssetObjectJSONObject) {

		return new BusinessEventVersion(
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_AUTHOR),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_CHANGE),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_COMMENT),
				jiraAssetObjectJSONObject),
			getAttributeKey(
				attr(Constants.ATTRIBUTE_NAME_CREATED),
				jiraAssetObjectJSONObject));
	}

	public static class Constants {

		public static final String ATTRIBUTE_NAME_AUTHOR = "Author";

		public static final String ATTRIBUTE_NAME_CHANGE = "Change";

		public static final String ATTRIBUTE_NAME_COMMENT = "Comment";

		public static final String ATTRIBUTE_NAME_CREATED = "Created";

		public static final String OBJECT_SCHEMA_NAME = "Business Events";

		public static final String OBJECT_TYPE_NAME = "Business Event Version";

	}

}