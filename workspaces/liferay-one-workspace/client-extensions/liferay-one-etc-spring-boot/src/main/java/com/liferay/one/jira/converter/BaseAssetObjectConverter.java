/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.AssetSchemaService;
import com.liferay.one.jira.util.AQLUtil;

import java.util.Map;
import java.util.function.Consumer;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;

/**
 * @author Amos Fong
 * @author Drew Brokke
 */
public abstract class BaseAssetObjectConverter {

	public String getAQLWithBuilder(Consumer<AQLUtil.Builder> consumer) {
		AQLUtil.Builder builder = AQLUtil.builder(getBaseAQL());

		if (consumer != null) {
			consumer.accept(builder);
		}

		return builder.build();
	}

	public String getObjectTypeId() {
		return _assetSchemaService.getObjectTypeId(
			getObjectSchemaName(), getObjectTypeName());
	}

	public JiraAssetObject toJiraAssetObject(JSONObject jsonObject) {
		return new JiraAssetObject(jsonObject, getAttributeIds());
	}

	protected Map<String, String> getAttributeIds() {
		return _assetSchemaService.getAttributeIds(
			getObjectSchemaName(), getObjectTypeName());
	}

	protected String getBaseAQL() {
		return AQLUtil.getBaseAQL(getObjectSchemaName(), getObjectTypeName());
	}

	protected abstract String getObjectSchemaName();

	protected abstract String getObjectTypeName();

	@Autowired
	private AssetSchemaService _assetSchemaService;

}