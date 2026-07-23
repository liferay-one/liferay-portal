/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.headless.admin.user.client.dto.v1_0.Role;
import com.liferay.one.jira.constants.ContactRoleConstants;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.util.role.EmployeeRoles;

import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class ContactRoleConverter extends BaseJiraAssetObjectConverter {

	@Override
	public String getObjectTypeName() {
		return ContactRoleConstants.OBJECT_TYPE_NAME;
	}

	public JiraAssetObject toAssetObject(Role role) {
		JiraAssetObject jiraAssetObject = createJiraAssetObject();

		jiraAssetObject.setAttributeValue(
			ContactRoleConstants.ATTRIBUTE_NAME_EXTERNAL_KEY,
			role.getExternalReferenceCode());
		jiraAssetObject.setAttributeValue(
			ContactRoleConstants.ATTRIBUTE_NAME_NAME, role.getName());
		jiraAssetObject.setAttributeValue(
			ContactRoleConstants.ATTRIBUTE_NAME_DESCRIPTION,
			role.getDescription());
		jiraAssetObject.setAttributeValue(
			ContactRoleConstants.ATTRIBUTE_NAME_EXTERNAL_CREATED_AT,
			formatDate(role.getDateCreated()));
		jiraAssetObject.setAttributeValue(
			ContactRoleConstants.ATTRIBUTE_NAME_EXTERNAL_UPDATED_AT,
			formatDate(role.getDateModified()));
		jiraAssetObject.setAttributeValue(
			ContactRoleConstants.ATTRIBUTE_NAME_TYPE, _getType(role));

		return jiraAssetObject;
	}

	@Override
	protected String getObjectSchemaName() {
		return _schemaName;
	}

	private String _getType(Role role) {
		if (Objects.equals(role.getRoleType(), "organization")) {
			return ContactRoleConstants.ATTRIBUTE_VALUE_TYPE_TEAM;
		}

		if (_employeeRoleNames.contains(role.getName())) {
			return ContactRoleConstants.ATTRIBUTE_VALUE_TYPE_ACCOUNT_WORKER;
		}

		return ContactRoleConstants.ATTRIBUTE_VALUE_TYPE_ACCOUNT_CUSTOMER;
	}

	private final List<String> _employeeRoleNames = EmployeeRoles.getNames();

	@Value("${liferay.one.jira.asset.schema.name}")
	private String _schemaName;

}