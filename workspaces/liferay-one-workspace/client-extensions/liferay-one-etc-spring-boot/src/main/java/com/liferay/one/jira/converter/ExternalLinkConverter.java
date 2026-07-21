/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.ExternalLinkConstants;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.model.Property;
import com.liferay.petra.string.CharPool;
import com.liferay.petra.string.StringUtil;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class ExternalLinkConverter extends BaseJiraAssetObjectConverter {

	@Override
	public String getObjectTypeName() {
		return ExternalLinkConstants.OBJECT_TYPE_NAME;
	}

	public boolean isExternalLinkProperty(Property property) {
		if (_toExternalLinkInfo(property) != null) {
			return true;
		}

		return false;
	}

	public JiraAssetObject toAssetObject(Property property) {
		ExternalLinkInfo externalLinkInfo = _toExternalLinkInfo(property);

		if (externalLinkInfo == null) {
			return null;
		}

		JiraAssetObject jiraAssetObject = createJiraAssetObject();

		jiraAssetObject.setAttributeValue(
			ExternalLinkConstants.ATTRIBUTE_NAME_NAME, property.getClassName());
		jiraAssetObject.setAttributeValue(
			ExternalLinkConstants.ATTRIBUTE_NAME_EXTERNAL_KEY,
			property.getExternalReferenceCode());
		jiraAssetObject.setAttributeValue(
			ExternalLinkConstants.ATTRIBUTE_NAME_DOMAIN,
			externalLinkInfo.getDomain());
		jiraAssetObject.setAttributeValue(
			ExternalLinkConstants.ATTRIBUTE_NAME_ENTITY_ID,
			property.getValue());
		jiraAssetObject.setAttributeValue(
			ExternalLinkConstants.ATTRIBUTE_NAME_ENTITY_NAME,
			externalLinkInfo.getEntityName());

		return jiraAssetObject;
	}

	@Override
	protected String getObjectSchemaName() {
		return _schemaName;
	}

	private ExternalLinkInfo _toExternalLinkInfo(Property property) {
		List<String> parts = StringUtil.split(
			property.getName(), CharPool.COLON);

		if (parts.size() != 2) {
			return null;
		}

		return new ExternalLinkInfo(parts.get(0), parts.get(1));
	}

	@Value("${liferay.one.jira.asset.schema.name}")
	private String _schemaName;

	private static class ExternalLinkInfo {

		public ExternalLinkInfo(String domain, String entityName) {
			_domain = domain;
			_entityName = entityName;
		}

		public String getDomain() {
			return _domain;
		}

		public String getEntityName() {
			return _entityName;
		}

		private final String _domain;
		private final String _entityName;

	}

}