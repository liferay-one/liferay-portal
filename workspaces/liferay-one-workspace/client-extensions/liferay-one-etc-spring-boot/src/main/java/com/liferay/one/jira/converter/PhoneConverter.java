/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.headless.admin.user.client.dto.v1_0.Phone;
import com.liferay.one.jira.constants.PhoneConstants;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class PhoneConverter extends BaseJiraAssetObjectConverter {

	@Override
	public String getExternalKeyAttributeName() {
		return PhoneConstants.ATTRIBUTE_NAME_NUMBER;
	}

	@Override
	public String getObjectTypeName() {
		return PhoneConstants.OBJECT_TYPE_NAME;
	}

	public JiraAssetObject toAssetObject(Phone phone) {
		JiraAssetObject jiraAssetObject = createJiraAssetObject();

		String phoneNumber = phone.getPhoneNumber();

		jiraAssetObject.setAttributeValue(
			PhoneConstants.ATTRIBUTE_NAME_NAME, phoneNumber);
		jiraAssetObject.setAttributeValue(
			PhoneConstants.ATTRIBUTE_NAME_NUMBER, phoneNumber);

		jiraAssetObject.setAttributeValue(
			PhoneConstants.ATTRIBUTE_NAME_PRIMARY, phone.getPrimary());
		jiraAssetObject.setAttributeValue(
			PhoneConstants.ATTRIBUTE_NAME_TYPE, _getType(phone.getPhoneType()));

		return jiraAssetObject;
	}

	@Override
	protected String getObjectSchemaName() {
		return _schemaName;
	}

	private String _getType(String phoneType) {
		if (Validator.isNull(phoneType)) {
			return null;
		}

		phoneType = StringUtil.toLowerCase(phoneType);

		if (phoneType.contains("mobile")) {
			return "Mobile";
		}

		return "Other";
	}

	@Value("${liferay.one.jira.asset.schema.name}")
	private String _schemaName;

}