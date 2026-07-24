/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.one.jira.constants.AccountContactRoleAssignmentConstants;
import com.liferay.one.jira.converter.AccountContactRoleAssignmentConverter;
import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.ContactConverter;
import com.liferay.one.jira.converter.ContactRoleConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.petra.string.StringBundler;

import java.util.Date;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class AccountUserAccountRoleSynchronizer {

	public void syncAssignRole(
			String roleExternalKey, String userAccountExternalKey,
			String accountExternalKey)
		throws Exception {

		_syncAssignment(
			roleExternalKey, userAccountExternalKey, accountExternalKey, false);
	}

	public void syncUnassignRole(
			String roleExternalKey, String userAccountExternalKey,
			String accountExternalKey)
		throws Exception {

		_syncAssignment(
			roleExternalKey, userAccountExternalKey, accountExternalKey, true);
	}

	private void _syncAssignment(
			String roleExternalKey, String userAccountExternalKey,
			String accountExternalKey, boolean deleted)
		throws Exception {

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					deleted ? "Unassigning" : "Assigning", " role ",
					roleExternalKey, " for user account ",
					userAccountExternalKey, " on account ",
					accountExternalKey));
		}

		JiraAssetObject jiraAssetObject =
			_accountContactRoleAssignmentConverter.toAssetObject(
				roleExternalKey, userAccountExternalKey, accountExternalKey,
				deleted, new Date());

		jiraAssetObject.setAttributeValue(
			AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_CONTACT_ROLE,
			_jiraAssetService.getReferenceObjectId(
				_contactRoleConverter, roleExternalKey));
		jiraAssetObject.setAttributeValue(
			AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_CONTACT,
			_jiraAssetService.getReferenceObjectId(
				_contactConverter, userAccountExternalKey));
		jiraAssetObject.setAttributeValue(
			AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_ACCOUNT,
			_jiraAssetService.getReferenceObjectId(
				_accountConverter, accountExternalKey));

		_jiraAssetService.upsert(
			_accountContactRoleAssignmentConverter, jiraAssetObject);
	}

	private static final Log _log = LogFactory.getLog(
		AccountUserAccountRoleSynchronizer.class);

	@Autowired
	private AccountContactRoleAssignmentConverter
		_accountContactRoleAssignmentConverter;

	@Autowired
	private AccountConverter _accountConverter;

	@Autowired
	private ContactConverter _contactConverter;

	@Autowired
	private ContactRoleConverter _contactRoleConverter;

	@Autowired
	private JiraAssetService _jiraAssetService;

}