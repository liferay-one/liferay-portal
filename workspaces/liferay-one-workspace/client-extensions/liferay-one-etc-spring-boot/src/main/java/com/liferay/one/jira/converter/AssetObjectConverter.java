/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.service.AssetSchemaService;
import com.liferay.one.jira.util.AQLUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;

/**
 * @author Amos Fong
 */
public abstract class AssetObjectConverter {

	public String getBaseAQL() {
		return AQLUtil.getBaseAQL(getObjectSchemaName(), getObjectTypeName());
	}

	public String getObjectTypeId() {
		return _assetSchemaService.getObjectTypeId(
			getObjectSchemaName(), getObjectTypeName());
	}

	protected Map<String, String> getAttributeIds() {
		return _assetSchemaService.getAttributeIds(
			getObjectSchemaName(), getObjectTypeName());
	}

	protected String getAttributeKey(
		String attributeId, JSONObject jsonObject) {

		return _getAttributeKey(
			_getAttributeValueJSONObject(
				attributeId, jsonObject.getJSONArray("attributes")));
	}

	protected String getAttributeValue(
		String attributeId, JSONObject jsonObject) {

		JSONObject attributeValueJSONObject = _getAttributeValueJSONObject(
			attributeId, jsonObject.getJSONArray("attributes"));

		return attributeValueJSONObject.optString(
			"displayValue", _getAttributeKey(attributeValueJSONObject));
	}

	protected abstract String getObjectSchemaName();

	protected abstract String getObjectTypeName();

	private String _getAttributeKey(JSONObject attributeValueJSONObject) {
		String key = attributeValueJSONObject.optString("value");

		if (Validator.isNull(key)) {
			JSONObject referencedObjectJSONObject =
				attributeValueJSONObject.optJSONObject("referencedObject");

			if (referencedObjectJSONObject != null) {
				key = referencedObjectJSONObject.optString("id");
			}
		}

		return key;
	}

	private JSONObject _getAttributeValueJSONObject(
		String attributeId, JSONArray attributesJSONArray) {

		if (Validator.isNull(attributeId)) {
			return new JSONObject();
		}

		for (int i = 0; i < attributesJSONArray.length(); i++) {
			JSONObject attributeJSONObject = attributesJSONArray.getJSONObject(
				i);

			String objectTypeAttributeId = attributeJSONObject.optString(
				"objectTypeAttributeId");

			if (Validator.isNull(objectTypeAttributeId) ||
				!attributeId.equals(objectTypeAttributeId)) {

				continue;
			}

			JSONArray attributeValuesJSONArray =
				attributeJSONObject.optJSONArray("objectAttributeValues");

			if ((attributeValuesJSONArray == null) ||
				attributeValuesJSONArray.isEmpty()) {

				break;
			}

			return attributeValuesJSONArray.getJSONObject(0);
		}

		return new JSONObject();
	}

	@Autowired
	private AssetSchemaService _assetSchemaService;

}