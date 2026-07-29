/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.one.jira.constants.AccountTeamRoleAssignmentConstants;
import com.liferay.one.jira.constants.TeamRoleConstants;
import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.AccountTeamRoleAssignmentConverter;
import com.liferay.one.jira.converter.TeamConverter;
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
public class AccountOrganizationSynchronizer {

	public void syncAssignOrganization(
			String organizationExternalKey, String accountExternalKey)
		throws Exception {

		_syncAssignment(organizationExternalKey, accountExternalKey, false);
	}

	public void syncUnassignOrganization(
			String organizationExternalKey, String accountExternalKey)
		throws Exception {

		_syncAssignment(organizationExternalKey, accountExternalKey, true);
	}

	private void _syncAssignment(
			String organizationExternalKey, String accountExternalKey,
			boolean deleted)
		throws Exception {

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					deleted ? "Unassigning" : "Assigning", " account ",
					accountExternalKey, deleted ? " from" : " to",
					" organization ", organizationExternalKey));
		}

		JiraAssetObject jiraAssetObject =
			_accountTeamRoleAssignmentConverter.toAssetObject(
				TeamRoleConstants.EXTERNAL_KEY_FIRST_LINE_SUPPORT,
				organizationExternalKey, accountExternalKey, deleted,
				new Date());

		jiraAssetObject.setAttributeValue(
			AccountTeamRoleAssignmentConstants.ATTRIBUTE_NAME_TEAM_ROLE,
			_teamRoleSynchronizer.getFirstLineSupportTeamRoleObjectId());

		jiraAssetObject.setAttributeValue(
			AccountTeamRoleAssignmentConstants.ATTRIBUTE_NAME_TEAM,
			_jiraAssetService.getReferenceObjectId(
				_teamConverter, organizationExternalKey));
		jiraAssetObject.setAttributeValue(
			AccountTeamRoleAssignmentConstants.ATTRIBUTE_NAME_ACCOUNT,
			_jiraAssetService.getReferenceObjectId(
				_accountConverter, accountExternalKey));

		_jiraAssetService.upsert(
			_accountTeamRoleAssignmentConverter, jiraAssetObject);
	}

	private static final Log _log = LogFactory.getLog(
		AccountOrganizationSynchronizer.class);

	@Autowired
	private AccountConverter _accountConverter;

	@Autowired
	private AccountTeamRoleAssignmentConverter
		_accountTeamRoleAssignmentConverter;

	@Autowired
	private JiraAssetService _jiraAssetService;

	@Autowired
	private TeamConverter _teamConverter;

	@Autowired
	private TeamRoleSynchronizer _teamRoleSynchronizer;

}