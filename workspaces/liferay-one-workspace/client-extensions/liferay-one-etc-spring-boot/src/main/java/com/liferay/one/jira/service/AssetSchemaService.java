/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.exception.JiraAssetSchemaException;
import com.liferay.petra.string.StringBundler;

import java.util.Map;
import java.util.TreeSet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class AssetSchemaService {

	public String getAttributeId(
		String schemaName, String objectTypeName, String attributeName) {

		Map<String, String> attributeIds = _assetSchemaLoader.getAttributeIds(
			schemaName, objectTypeName);

		String attributeId = attributeIds.get(attributeName);

		if (attributeId == null) {
			throw new JiraAssetSchemaException(
				StringBundler.concat(
					"Attribute \"", attributeName,
					"\" not found on object type \"", objectTypeName,
					"\" in schema \"", schemaName, "\". Available attributes: ",
					new TreeSet<>(attributeIds.keySet())));
		}

		return attributeId;
	}

	public String getObjectTypeId(String schemaName, String objectTypeName) {
		Map<String, String> objectTypeIds = _assetSchemaLoader.getObjectTypeIds(
			schemaName);

		String objectTypeId = objectTypeIds.get(objectTypeName);

		if (objectTypeId == null) {
			throw new JiraAssetSchemaException(
				StringBundler.concat(
					"Object type \"", objectTypeName,
					"\" not found in schema \"", schemaName,
					"\". Available object types: ",
					new TreeSet<>(objectTypeIds.keySet())));
		}

		return objectTypeId;
	}

	@Autowired
	private AssetSchemaLoader _assetSchemaLoader;

}