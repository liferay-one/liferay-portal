/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.model.Organization;
import com.liferay.petra.string.StringPool;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Franca
 */
@Component
public class OrganizationConverter extends AssetObjectConverter {

	@Override
	public String getObjectSchemaName() {
		return StringPool.BLANK;
	}

	@Override
	public String getObjectTypeName() {
		return StringPool.BLANK;
	}

	public Organization toOrganization(JSONObject assetObjectJSONObject) {
		return new Organization(
			getAttributeValue(_externalKeyAttributeId, assetObjectJSONObject),
			assetObjectJSONObject.optString("id"),
			assetObjectJSONObject.optString("name"));
	}

	@Value(
		"${liferay.one.jira.organization.asset.object.type.attribute.external.key}"
	)
	private String _externalKeyAttributeId;

}